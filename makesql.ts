/* ************************************************** *\
 * 
 * 出力設定：DBカラムのデータ型と、オブジェクトの型のマッピング
 * 
\* ************************************************** */

/** 出力時のパッケージ(デフォルト) */
var JAVA_PACKAGE = "com.example";

/** 
 * 出力モード
 * "MyBatis", "JPA", "ALL"
 */
var OUTPUT_MODE = "ALL";

/** 
 * 出力先フォルダ
 * 未指定の場合は、入力元と同じ
 */
var OUTPUT_DIR  = "";

/** DBカラムのデータ型と、オブジェクトの型のマッピング */
var COLTYPE_JAVATYPE ={
    //数値
    "tinyint(1)" : "Boolean",                // 皆大好きフラグ。大体の場合は区分値の別名。原義に反し、2値(0/1とか、1/2とか、Y/Nとか)にならない。
    "bit"        : "Boolean",                // 皆大好きフラグ。大体の場合は区分値の別名。原義に反し、2値(0/1とか、1/2とか、Y/Nとか)にならない。
    "number"     : "java.math.BigDecimal",
    "decimal"    : "java.math.BigDecimal",
    "double"     : "java.math.BigDecimal",
    "float"      : "java.math.BigDecimal",
    //文字列
    "char"       : "String",                 // コード値に利用されることがあるchar、DDL上の桁数に対して、使うコードの長さが小さいことがよくある。
    "varchar"    : "String",
    "varchar2"   : "String",
    //日付・時刻
    "time"       : "java.sql.Time",
    "date"       : "java.sql.Date",
    "timestamp"  : "java.sql.Timestamp",
    "datetime"   : "java.sql.Timestamp",     // SQLServerのDateTimeは見た目、msまで精度があるように見え、実際は、3.5ms位の精度(0ms, 3ms, 7ms)しかない。
    "datetime2"  : "java.sql.Timestamp"
}

/** マルチプルインサートを出力するか(要:SQL-92) */
var FLG_MYBATIS_MULTIPLE_INSERT = true;

/* ************************************************** *\
 * 
 * 以下、処理本文
 * 
\* ************************************************** */

// チェック：引数は指定されている？
if(WScript.Arguments.length < 1){
    var errMsg = "CSVファイルを指定してください\r\n";
    
    errMsg += "\r\n";
    errMsg += "[使用方法]" + "\r\n";
    errMsg += "　引数1 　　　　　 　a5m2_COLUMNS.csvへのファイルパス" + "\r\n";
    errMsg += "　引数2(オプション)　javaのパッケージ名。デフォルトは"+ JAVA_PACKAGE + "\r\n";
    errMsg += "　引数3(オプション)　ファイル出力先。デフォルトは入力元と同じフォルダ" + "\r\n";

    WScript.Echo(errMsg);
    WScript.Quit(-1);
}

var objFSO = new ActiveXObject("Scripting.FileSystemObject");

// CSVファイル(大元)
var csvFile = WScript.Arguments.Item(0);
// パッケージ名
var jpack = WScript.Arguments.length>=2? WScript.Arguments.Item(1): JAVA_PACKAGE;
// 出力先
var workDir = WScript.Arguments.length>=3? WScript.Arguments.Item(2):
              (OUTPUT_DIR && OUTPUT_DIR.length!=0)? OUTPUT_DIR: objFSO.GetParentFolderName(objFSO.GetAbsolutePathName(csvFile));
// 出力モード(JPA, MyBatis)
var mode = OUTPUT_MODE;

// チェック：ファイルは存在する？
if( !objFSO.FileExists(csvFile) ){
    var errMsg = "ファイルが空です";
    WScript.Echo(errMsg);
    WScript.Quit(-1);
}

// チェック：出力先フォルダは存在する？
if( !objFSO.FolderExists(workDir) ){
    var errMsg = "指定されたフォルダは存在しません";
    WScript.Echo(errMsg);
    WScript.Quit(-1);
}


namespace utility{
    export class Set{
        private hash:any[];
        private array:any[];

        constructor(){
            this.hash=[];
            this.array=[];
        }

        add(val:any){
            if(!this.hash[val]){
                this.hash[val]=true;
                this.array.push(val);
            }
        }

        values(){
            return this.array;
        }
    }

    export function snake2camel(text:string, headUpper:boolean){
        var converted = "";
        var sourceStr = text.toLowerCase();
        var idx;
        while( (idx = sourceStr.indexOf("_")) != -1 ){
            if(idx+ 1 < sourceStr.length ){
                converted += sourceStr.substring(0, idx)
                          +  sourceStr.charAt(idx+1).toUpperCase();

                sourceStr = sourceStr.substring(idx+2);
            }
            else break;
        }
        converted = converted + sourceStr;

        if(headUpper){
            converted = converted.charAt(0).toUpperCase() + converted.substring(1);
        }

        return converted;
    }

    export function rpad(text:string, len:number){
        var buff = text;
        while(buff.length <= len){
            buff = buff + " ";
        }
        return buff;
    }

    export function rpeatPad(len:number){
        return rpad("", len);
    }
}

/** ファイル読み込みに関するパッケージ */
namespace csvload{

    /** テーブルの情報 */
    export class TableInfo{
        /** テーブル名 */
        tableName:string;
        /** 論理名 */
        logicalName: string;
        /** テーブルのカラム一覧 */
        columns:Array<ColumnInfo>;
        primeColumns:Array<ColumnInfo>;

        columnNameMaxLen:number;
        javaNameMaxLen:number;

        constructor(tableName:string, tableDescription:string, columns:Array<ColumnInfo>){
            this.tableName = tableName;
            this.logicalName = tableDescription;
            this.columns=[];
            this.columnNameMaxLen = 0;
            this.javaNameMaxLen = 0;
            for(var col of columns){
                if(col){
                    this.columns.push(col);
                    this.columnNameMaxLen = Math.max(this.columnNameMaxLen, col.columnName.length);
                    this.javaNameMaxLen   = Math.max(this.columnNameMaxLen, col.javaName.length);
                } 
            }

            // 主キー探査
            var primecolsBuff = [];
            for(var column of this.columns){
                if(column.keyPosition && column.keyPosition.length!=0){
                    primecolsBuff[Number(column.keyPosition)] = column;
                }
            }
            this.primeColumns = [];
            for(var primcol of primecolsBuff){
                if(primcol){
                    this.primeColumns.push(primcol)
                }
            }

        }
    }

    /** カラムの情報 */
    export class ColumnInfo{
        /** 主キーとしての順番 */
        keyPosition   :string;
        /** カラムの物理名 */
        columnName    :string;
        /** カラムの型、ただし、桁数も含む(ex: varchar(23) ) */
        columnType    :string;
        /** 論理名 */
        logicalName   :string;
        /** カラム名をjava用に変換したもの */
        javaName      :string;
        /** java用の型(FQCN) */
        javaType      :string;
        /** java用の型(.を含まないクラス名) */
        javaTypeSimple:string;
        
        constructor(columnName:string, columnType:string, logicalName:string, keypos:string, typeConvertMap){
            this.keyPosition = keypos;
            this.columnName  = columnName;
            this.columnType  = columnType;
            this.logicalName = logicalName;
            this.javaName    = utility.snake2camel(columnName, false);

            this.javaType    = typeConvertMap[columnType.toLowerCase()];
            if(! this.javaType){
                // 解決できなかった場合、桁数情報を排除したうえで再度検索
                this.javaType    = typeConvertMap[columnType.toLowerCase().replace(/\(.+\)/g, "")];
            }
            if(! this.javaType){
                // それでも、解決できなかった場合はエラー
                WScript.Echo("テーブルの型「" + columnType +"」に対応するjavaの型を見つけることができませんでした。COLTYPE_JAVATYPEへ定義の追加をしてください");
                WScript.Quit(1);
            }

            if(this.javaType){
                var li = this.javaType.lastIndexOf('.');
                if(li==-1){
                    this.javaTypeSimple = this.javaType;
                }else{
                    this.javaTypeSimple = this.javaType.substring(li+1);
                }
            }

       }
    }

    /** 一行分のテキストを供給するためのインターフェース */
    interface ILineProp{
        hasNext(): boolean;
        next(): string;
        close();
    }

    /** FileSystemObjectを使用し、テキストファイル(ShiftJis)の中身を読み込むクラス */
    class FileSystemObjectLineProp implements ILineProp{
        private _stream: any;
        private _next: string;

        constructor(objFso:any, filePath:string){
            this._stream  = objFso.OpenTextFile(filePath, 1);
        }

        hasNext():boolean{
            if(this._next){
                return true;
            }
            else if(this._stream){
                if(this._stream.AtEndOfLine){
                    this._stream.Close();
                    this._stream = null;
                    return false;
                }
                this._next = this._stream.ReadLine();
                return true;
            }
            return false;
        }

        next(): string{
            try{
                if(this._next){
                    return this._next;
                }
                else{
                    throw "call hasNext please";
                }
            }finally{
                this._next=null;
            }
        } 

        close(){
            if(this._stream){
                this._next=null;
                this._stream.Close();
                this._stream=null;
            }
        }
    }

    /** Splitよりまだましな、CSVの意味を理解しているCSVパーサ */
    class PJCsvRead {
        private _provider: ILineProp;
        private _next: string[];

        constructor(sep: ILineProp){
            this._provider=sep;
        }

        hasNext():boolean{
            if(! this._next){
                if(this._provider.hasNext()){
                    var line = this._provider.next();
                    var elems = line.split(",");

                    this._next = [];

                    for(var idx=0; idx<elems.length; ++idx){
                        var elem = elems[idx];

                        //先頭が、"で始まるなら、、、

                        if(elem.length!==0 && elem.charAt(0)==="\""){
                            // "の数が偶数になるまで、文字結合を行う
                            while( (elem.match(/"/g)||[]).length%2==1 ){
                                var sep = ",";
                                if( idx+1 >= elems.length ){
                                    // 配列を食いつぶしたら、次の行のデータを読み込む
                                    if( this._provider.hasNext() ){
                                        sep = "\n";

                                        // 配列延長
                                        var nelems = this._provider.next().split(",");
                                        for(var idx2=0; idx2<nelems.length; ++idx2){
                                            elems.push(nelems[idx2]);
                                        }
                                    }
                                    else throw "CSVフォーマットエラー"
                                }
                                elem = elem + sep + elems[++idx];
                            }
                        }

                        if(elem.charAt(0)=="\"" && elem.charAt(elem.length-1)=="\"" ){
                            if(/^"+$/.test(elem) || elem.search(/[^"]/)%2==1){
                                // ”のみによる文字 もしくは、 先頭の"が奇数回続く
                                elem = elem.substring(1, elem.length-1);
                            }
                        }

                        elem = elem.replace(/""/g,"\"");

                        this._next.push(elem);
                    }
                    return true;
                }
                else{
                    return false;
                }
            }
        }

        next():string[]{
            try{
                if(this._next){
                    return this._next;
                }
                else{
                    throw "call hasNext please";
                }
            }finally{
                this._next=null;
            }
        }

        close(){
            if(this._provider){
                this._provider.close();
                this._next=null;
            }
        }
    }

    function loadTableDescription(objFSO:any, tableCsvFile:string): {[key:string]: string}{
        if(! objFSO.FileExists(tableCsvFile) ){
            // ぞんざいしない場合は何もしない
            return {};
        }

        var linesp = null;
        var csvparser = null;
        try{
            linesp = new FileSystemObjectLineProp(objFSO, tableCsvFile);
            csvparser = new PJCsvRead(linesp);

            var headmap:{[key:string]: number} ={}
            if(csvparser.hasNext()){
                // ヘッダ読込
                var elements = csvparser.next();
                for(var idx=0; idx<elements.length; ++idx){
                    switch(elements[idx].toUpperCase()){
                        case "TABLE_NAME":
                            headmap["TABLE_NAME"] = idx;
                            break;
                        case "LOGICAL_NAME":
                            headmap["LOGICAL_NAME"] = idx;
                            break;
                    }
                }
            }
            else{
                // ぞんざいしない場合は何もしない
                return {};
            }

            // ボディ部読み込み            
            var tableDescription:{[key:string]: string} ={};
            while(csvparser.hasNext()){
                var elements = csvparser.next();
                var tableName = elements[headmap["TABLE_NAME"]];
                var logicalName  = elements[headmap["LOGICAL_NAME"]];
                tableDescription[tableName] = logicalName
            }    
            return tableDescription;

        }finally{
            if(csvparser){
                csvparser.close();
                csvparser=null;
            }
            else if(linesp){
                linesp.close();
                linesp=null;
            }
        }
    }

    export function loadcsv(objFSO:any, csvFile:string, typeConvertMap): Array<TableInfo> {
        var linesp = null;
        var csvparser = null;

        // 「a5m2_COLUMNS.csv」以外に、「a5m2_TABLES.csv」がある場合は、
        // そちらも読み込む
        var tableCsvFile = objFSO.BuildPath(objFSO.GetParentFolderName(csvFile), "a5m2_TABLES.csv");
        var tableDescription:{[key:string]: string} =loadTableDescription(objFSO, tableCsvFile);

        try{
            linesp = new FileSystemObjectLineProp(objFSO, csvFile);
            csvparser = new PJCsvRead(linesp);

            // ヘッダ部読み込み
            var headmap:{[key:string]: number} ={}
            if(csvparser.hasNext()){
                var elements = csvparser.next();
                for(var idx=0; idx<elements.length; ++idx){
                    switch(elements[idx].toUpperCase()){
                        case "TABLE_NAME":
                            headmap["TABLE_NAME"] = idx;
                            break;
                        case "COLUMN_NAME":
                            headmap["COLUMN_NAME"] = idx;
                            break;
                        case "LOGICAL_NAME":
                            headmap["LOGICAL_NAME"] = idx;
                            break;
                        case "DATA_TYPE":
                            headmap["DATA_TYPE"] = idx;
                            break;
                        case "ORDINAL_POSITION":
                            headmap["ORDINAL_POSITION"] = idx;
                            break;
                        case "KEY_POSITION":
                            headmap["KEY_POSITION"] = idx;
                            break;
                    }
                }
            }
            else{
                WScript.Echo("ERROR: ファイルが空です");
                WScript.Quit(-1);
            }

            // ボディ部読み込み
            var tableNames:Array<string> = [];
            var tableInfoBuild:{ [key:string]: Array<ColumnInfo>} = {};
            while(csvparser.hasNext()){
                var elements = csvparser.next();

                var ordianlIdx  = elements[headmap["ORDINAL_POSITION"]];
                var tableName   = elements[headmap["TABLE_NAME"]];
                var columnName  = elements[headmap["COLUMN_NAME"]];
                var logicalName = elements[headmap["LOGICAL_NAME"]];
                var columnType  = elements[headmap["DATA_TYPE"]];
                var keypos      = elements[headmap["KEY_POSITION"]];

                var arry = tableInfoBuild[tableName];
                if(!arry){
                    arry = [];
                    tableNames.push(tableName);
                    tableInfoBuild[tableName] = arry;
                }                
                arry[Number(ordianlIdx)] = new ColumnInfo(columnName, columnType, logicalName, keypos, typeConvertMap);
            }

            // TableInfoの生成
            var tableInfo:Array<TableInfo> =[];
            for(var table of tableNames){
                tableInfo.push(
                    new TableInfo(
                        table, tableDescription[table],
                        tableInfoBuild[table]));
            }
            return tableInfo;
        }finally{
            if(csvparser){
                csvparser.close();
            }
            else if(linesp){
                linesp.close();
            }
        } 
    }    

}

/** ファイル出力に関するパッケージ */
namespace gen{

    interface IWriter{
        write(text:string);
        newLine();
        close();
    }
    class UTF8FileWriter implements IWriter{
        filename:string;
        pre:any;

        constructor(filename:string){
            this.filename=filename;
            this.pre = new ActiveXObject("ADODB.Stream");
            this.pre.Type = 2;
            this.pre.Charset = 'UTF-8';
            this.pre.Open();
        }

        write(text:string){
            this.pre.WriteText(text);
        }

        newLine(){
            this.pre.WriteText("\r\n");
        }

        close(){
            this.pre.Position = 0;
            this.pre.Type = 1;
            this.pre.Position = 3;
            var bin = this.pre.Read();
            this.pre.Close();

            var stm = new ActiveXObject("ADODB.Stream");
            stm.Type = 1;
            stm.Open();
            stm.Write(bin);
            stm.SaveToFile(this.filename, 2);
            stm.Close();
        }
    }

    /** スクリプト出力用クラス */
    export class ScriptWriter{
        writer:IWriter;
        pretab:string;

        constructor(filename:string){
            this.writer=new UTF8FileWriter(filename);
            this.pretab="";
        }

        indent():ScriptWriter{
            this.pretab += "    ";
            return this;
        };

        dedent():ScriptWriter{
            this.pretab = this.pretab.substring(4);
            return this;
        };

        w(text:string):ScriptWriter{
            this.writer.write(this.pretab);
            this.writer.write(text);
            this.writer.newLine();
            return this;
        }

        close(){
            this.writer.close();
        }
    }

    export function exportMyBatisMapper(table:csvload.TableInfo, workDir:string){
        var filebase = makeClassSimpleName(table.tableName, "Mapper", "");
        var fqcn = makeClassFullName(table.tableName, "Mapper", "");
        var writer=null;
        try{
            writer = new ScriptWriter(objFSO.BuildPath(workDir, filebase + ".java"));

            if(jpack && jpack.length!=0){
                writer.w("package "+ jpack + ";");
                writer.w("");
            }

            exportImport(writer, table, [
                "java.io.Serializable",
                "java.util.List",
                "org.apache.ibatis.annotations.Param"
            ]);
            writer.w("");
            if(table.logicalName && table.logicalName.length!=0){
                writer.w('/**');
                writer.w(' * '+table.logicalName+'用のマッパー');
                writer.w(' */');
            }
            writer.w("public interface " + filebase + " {");
            writer.indent();

            writer.w('/**');
            writer.w(' * SELECT文');
            writer.w(' *');
            writer.w(' * @param query 検索条件');
            writer.w(' *');
            writer.w(' * @return 検索結果');
            writer.w(' */');
            writer.w('List<' + (table.primeColumns.length!=0? 'EntityWithKey': 'Entity') + '> select(@Param("query") Entity query);');
            writer.w("");

            writer.w('/**');
            writer.w(' * INSERT文');
            writer.w(' *');
            writer.w(' * @param entity 挿入項目');
            writer.w(' *');
            writer.w(' * @return 登録行数');
            writer.w(' */');
            writer.w('int insert(@Param("entity") Entity entity);');
            writer.w("");

            if(table.primeColumns.length!=0){
                // update
                writer.w('/**');
                writer.w(' * UPDATE文');
                writer.w(' *');
                writer.w(' * @param entity 更新項目');
                writer.w(' *');
                writer.w(' * @return 更新行数');
                writer.w(' */');
                writer.w('int updateByKey(@Param("entity") EntityWithKey entity);');
                writer.w("");
            
                // delete
                writer.w('/**');
                writer.w(' * DELETE文');
                writer.w(' *');
                writer.w(' * @param query 削除条件');
                writer.w(' *');
                writer.w(' * @return 削除件数');
                writer.w(' */');
                writer.w('int deleteByKey(@Param("query") EntityWithKey query);');
                writer.w("");
            }

            writer.w('/**');
            writer.w(' * UPDATE文');
            writer.w(' *');
            writer.w(' * @param entity 更新項目');
            writer.w(' * @param query 更新条件');
            writer.w(' *');
            writer.w(' * @return 更新行数');
            writer.w(' */');
            writer.w('int updateByQuery(@Param("entity") Entity entity, @Param("query") Entity query);');
            writer.w("");

            writer.w('/**');
            writer.w(' * DELETE文');
            writer.w(' *');
            writer.w(' * @param query 削除条件');
            writer.w(' *');
            writer.w(' * @return 削除件数');
            writer.w(' */');
            writer.w('int deleteByQuery(@Param("query") Entity query);');
            writer.w("");

            if(FLG_MYBATIS_MULTIPLE_INSERT){
                writer.w('/**');
                writer.w(' * INSERT MULTIPLE ROW文');
                writer.w(' *');
                writer.w(' * @param insertList 登録対象一覧');
                writer.w(' *');
                writer.w(' * @return 登録件数');
                writer.w(' */');
                writer.w('int insertMulti(@Param("insertList") List<? extends Entity> insertList);');
                writer.w("");
            }

            writer.w('/**');
            writer.w(' * テーブルの行を示すためのBeanクラス');
            writer.w(' */');
            writer.w('public static class Entity implements Serializable {');
            writer.indent();

            // フィールド
            for(var column of table.columns){
                writer.w("/** " + column.logicalName + " */");
                writer.w("private " + column.javaTypeSimple + " " + column.javaName + ";");
                writer.w("");
            }

            // セッターとゲッター
            for(var column of table.columns){
                var javaNameKey = column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);

                writer.w("/**");
                writer.w(" * " + column.logicalName + "を設定します");
                writer.w(" *");
                writer.w(" * @param " + column.javaName + " " + column.logicalName);
                writer.w(" */");
                writer.w("public void set" + javaNameKey + "(" + column.javaTypeSimple + " " + column.javaName + ") {");
                writer.indent();
                writer.w("this." + column.javaName + " = " + column.javaName + ";");
                writer.dedent();
                writer.w("}");
                writer.w("");
                writer.w("/**");
                writer.w(" * " + column.logicalName + "を取得します");
                writer.w(" *");
                writer.w(" * @return " + column.logicalName);
                writer.w(" */");
                writer.w("public " + column.javaTypeSimple + " get" + javaNameKey + "() {");
                writer.indent();
                writer.w("return this." + column.javaName + ";");
                writer.dedent();
                writer.w("}");
                writer.w("");
            }

            writer.dedent();
            writer.w('}');

            if(table.primeColumns.length!=0){
                var constructorArgs=[];
                for(var column of table.primeColumns){
                    var javaNameKey = 'key' + column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
                    constructorArgs.push(column.javaTypeSimple + ' ' + javaNameKey );
                }

                writer.w('');
                writer.w('/**');
                writer.w(' * テーブルの行を示すためのBeanクラス');
                writer.w(' */');
                    writer.w('public static class EntityWithKey extends Entity implements Serializable {');
                writer.indent();

                // フィールド
                for(var column of table.primeColumns){
                    var javaNameKey = 'key' + column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
                    writer.w('private '+ column.javaTypeSimple + ' ' + javaNameKey + ';');
                }
                writer.w('');


                // コンストラクタ
                writer.w('public EntityWithKey(' + constructorArgs.join(', ') + ') {');
                writer.indent();
                for(var column of table.primeColumns){
                    var javaNameKey = 'key' + column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
                    writer.w('this.'+ javaNameKey +' = ' + javaNameKey + ';');
                }
                writer.dedent();
                writer.w('}');

                // セッターとゲッター
                for(var column of table.primeColumns){
                    var javaNameKey = 'key' + column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
                    var javaNameKeyU = javaNameKey.charAt(0).toUpperCase() + javaNameKey.substring(1);

                    writer.w("/**");
                    writer.w(" * " + column.logicalName + "を設定します");
                    writer.w(" *");
                    writer.w(" * @param " + column.javaName + " " + column.logicalName);
                    writer.w(" */");
                    writer.w("public void set" + javaNameKeyU + "(" + column.javaTypeSimple + " " + column.javaName + ") {");
                    writer.indent();
                    writer.w("this." + javaNameKey + " = " + column.javaName + ";");
                    writer.dedent();
                    writer.w("}");
                    writer.w("");
                    writer.w("/**");
                    writer.w(" * " + column.logicalName + "を取得します");
                    writer.w(" *");
                    writer.w(" * @return " + column.logicalName);
                    writer.w(" */");
                    writer.w("public " + column.javaTypeSimple + " get" + javaNameKeyU + "() {");
                    writer.indent();
                    writer.w("return this." + javaNameKey + ";");
                    writer.dedent();
                    writer.w("}");
                    writer.w("");
                }

                writer.dedent();
                writer.w('}');
            }

            writer.dedent();
            writer.w("}");

        }finally{
            if(writer) writer.close();
        }
    }

    function exportImport(writer: ScriptWriter , table: csvload.TableInfo, additional:string[]){
        var set = new utility.Set();
        for(var column of table.columns){
            if(column.javaType.indexOf(".") != -1){
                set.add(column.javaType);
            }
        }
        for(var add of additional){
            set.add(add);            
        }

        for(var importClass of set.values().sort()){
            writer.w("import " + importClass + ";");
        }
    }

    export function exportMyBatisMapperXml(table:csvload.TableInfo, workDir:string){
        var filebase = makeClassSimpleName(table.tableName, "Mapper", "");
        var fqcn = makeClassFullName(table.tableName, "Mapper", "");
        var writer=null;
        try{
            writer = new ScriptWriter(objFSO.BuildPath(workDir, filebase + ".xml"));
    
            writer.w('<?xml version="1.0" encoding="UTF-8" ?>');
            writer.w('<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">');
            writer.w("<mapper namespace='" + fqcn + "'>");
            writer.indent();
    
            // ResultMapping
            writer.w('<resultMap id="resultMapEntity" type="' + fqcn + "$Entity" + '">');
            writer.indent();
            makeResultMapping(writer, table);
            writer.dedent();
            writer.w("</resultMap>");
            if(table.primeColumns.length!=0){
                writer.w('');
                writer.w('<resultMap id="resultMapEntityWithKey" type="' + fqcn + "$EntityWithKey" + '" extends="resultMapEntity">');
                writer.indent();
                writer.w('<constructor>');
                writer.indent();
                for(var column of table.primeColumns){
                    writer.w('<idArg column="' + column.columnName + '" javaType="' + column.javaType + '" />');
                }
                writer.dedent();
                writer.w('</constructor>');
                writer.dedent();
                writer.w("</resultMap>");
            }

            writer.w("");

            // select
            writer.w('<select id="select" resultMap="'+( table.primeColumns.length!=0? "resultMapEntityWithKey": "resultMapEntity" )  +'">');
            writer.indent();
            makeSelectSql(writer, table);
            writer.dedent();
            writer.w("</select>");
            writer.w("");
    
            // insert
            writer.w('<insert id="insert">');
            writer.indent();
            makeInsertSql(writer, table);
            writer.dedent();
            writer.w("</insert>");
            writer.w("");
    
            if(table.primeColumns.length!=0){
                // update
                writer.w('<update id="updateByKey">');
                writer.indent();
                makeUpdateKeySql(writer, table);
                writer.dedent();
                writer.w("</update>");
                writer.w("");
        
                // delete
                writer.w('<delete id="deleteByKey">');
                writer.indent();
                makeDeleteKeySql(writer, table);
                writer.dedent();
                writer.w("</delete>");
                writer.w("");
            }

            // update
            writer.w('<update id="updateByQuery">');
            writer.indent();
            makeUpdateSql(writer, table);
            writer.dedent();
            writer.w("</update>");
            writer.w("");
    
            // delete
            writer.w('<delete id="deleteByQuery">');
            writer.indent();
            makeDeleteSql(writer, table);
            writer.dedent();
            writer.w("</delete>");
            writer.w("");

            if(FLG_MYBATIS_MULTIPLE_INSERT){
                // insert multi row
                writer.w('<insert id="insertMulti" databaseId="Oracle" >')
                writer.indent();
                makeInsertMultiSqlForOracle(writer, table);
                writer.dedent();
                writer.w('</insert>');
                writer.w('');
                writer.w('<insert id="insertMulti">');
                writer.indent();
                makeInsertMultiSqlForSQL92(writer, table);
                writer.dedent();
                writer.w('</insert>');
            }

            writer.dedent();
            writer.w("</mapper>")
        }finally{
            if(writer) writer.close();
        }
    }

    function makeClassSimpleName(tableName:string, classNamePrefix:string, classNameSuffix:string):string{
        var buff="";

        if(classNamePrefix){
            buff += classNamePrefix;
        }

        buff += utility.snake2camel(tableName, true);

        if(classNameSuffix){
            buff += classNameSuffix;
        }

        return buff;
    }

    function makeClassFullName(tableName:string, classNamePrefix:string, classNameSuffix:string):string{
        var buff="";

        if(jpack && jpack.length!=0){
            buff += jpack + ".";
        }

        buff += makeClassSimpleName(tableName, classNamePrefix, classNameSuffix);

        return buff;
    }

    function makeResultMapping(out:ScriptWriter, table:csvload.TableInfo){
        for(var column of table.columns){
            var columnIndent   = utility.rpeatPad(table.columnNameMaxLen - column.columnName.length + 1);
            var propertyIndent = utility.rpeatPad(table.javaNameMaxLen   - column.javaName.length + 1);
            if(column.keyPosition){
                out.w('<id     column="'+column.columnName+'" '+ columnIndent +' property="'+column.javaName+'"'+propertyIndent+'/>');
            }else{
                out.w('<result column="'+column.columnName+'" '+ columnIndent +' property="'+column.javaName+'"'+propertyIndent+'/>');
            }
        }
    }

    function makeSelectSql(out:ScriptWriter, table:csvload.TableInfo){        
        out.w("SELECT");
        // カラム
        out.indent();
        var firstColumn = true;
        for(var column of table.columns){
            var prefix = firstColumn? " ": ",";
            out.w(prefix + column.columnName);

            firstColumn=false;
        }
        out.dedent();
        // テーブル
        out.w("FROM");
        out.indent().w(table.tableName).dedent();
        // 条件
        out.w("<where>");
        out.indent();
        for(var column of table.columns){
            var testQuery = "query." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol  = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                            + utility.rpad("#{query." + column.javaName + "}", table.javaNameMaxLen + "#{query.}".length)
            out.w('<if test="'+testQuery+'">'+queryCol+'</if>');
        }
        out.dedent();
        out.w("</where>");
    }

    function makeInsertSql(out:ScriptWriter, table: csvload.TableInfo){
        out.w("INSERT INTO");
        out.indent().w(table.tableName).dedent();

        out.w("(");
        out.indent();
        var firstColumn = true;
        for(var column of table.columns){
            var prefix = firstColumn? " ": ",";
            out.w(prefix + column.columnName);

            firstColumn=false;
        }
        out.dedent();

        out.w(")");
        out.w("VALUES (");
        out.indent();
        var firstValue = true;
        for(var column of table.columns){
            var prefix = firstValue? " ": ",";
            out.w(prefix + "#{entity." + column.javaName + "}");

            firstValue=false;
        }
        out.dedent();
        out.w(")");
    }

    function makeInsertMultiSqlForSQL92(out:ScriptWriter, table:csvload.TableInfo){
        out.w("INSERT INTO");
        out.indent().w(table.tableName).dedent();

        out.w("(");
        out.indent();
        var firstColumn = true;
        for(var column of table.columns){
            var prefix = firstColumn? " ": ",";
            out.w(prefix + column.columnName);

            firstColumn=false;
        }
        out.dedent();

        out.w(")");

        out.w('<trim prefix="VALUES " suffixOverrides="," suffix=" " >');
        out.indent();
        out.w('<foreach item="entity" collection="insertList">');
        out.indent();
        out.w("(");
        out.indent();
        var firstValue = true;
        for(var column of table.columns){
            var prefix = firstValue? " ": ",";
            out.w(prefix + "#{entity." + column.javaName + "}");

            firstValue=false;
        }
        out.dedent();
        out.w('),');
        out.dedent();
        out.w('</foreach>');
        out.dedent();
        out.w("</trim>");
    }

    function makeInsertMultiSqlForOracle(out:ScriptWriter, table:csvload.TableInfo){
        out.w('INSERT ALL');
        out.w('<foreach item="entity" collection="insertList">');
        out.indent();
        out.w("INTO " + table.tableName)
        out.w("(");
        out.indent();
        var firstColumn = true;
        for(var column of table.columns){
            var prefix = firstColumn? " ": ",";
            out.w(prefix + column.columnName);

            firstColumn=false;
        }
        out.dedent();

        out.w(")");
        out.w("VALUES (");
        out.indent();
        var firstValue = true;
        for(var column of table.columns){
            var prefix = firstValue? " ": ",";
            out.w(prefix + "#{entity." + column.javaName + "}");

            firstValue=false;
        }
        out.dedent();
        out.w(")");
        out.dedent();
        out.w('</foreach>');
        out.w('SELECT * FROM DUAL');
    }

    function makeUpdateSql(out:ScriptWriter, table: csvload.TableInfo){
        out.w("UPDATE");
        out.indent().w(table.tableName).dedent();
        // 更新項目
        out.w("<set>");
        out.indent();
        for(var column of table.columns){
            var testQuery = "entity." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol  = utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                          + utility.rpad("#{entity." + column.javaName + "}", table.javaNameMaxLen + "#{entity.}".length)
            out.w('<if test="'+testQuery+'">'+queryCol+' , </if>');
        }
        out.dedent();
        out.w("</set>");
        // 条件
        out.w("<where>");
        out.indent();
        for(var column of table.columns){
            var testQuery = "query." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol  = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                          + utility.rpad("#{entity." + column.javaName + "}", table.javaNameMaxLen + "#{entity.}".length)
            out.w('<if test="'+testQuery+'">'+queryCol+'</if>');
        }
        out.dedent();
        out.w("</where>");
    }

    function makeUpdateKeySql(out:ScriptWriter, table: csvload.TableInfo){
        out.w("UPDATE");
        out.indent().w(table.tableName).dedent();
        // 更新項目
        out.w("<set>");
        out.indent();
        for(var column of table.columns){
            var testQuery = "entity." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol  = utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                          + utility.rpad("#{entity." + column.javaName + "}", table.javaNameMaxLen + "#{entity.}".length)
            out.w('<if test="'+testQuery+'">'+queryCol+' , </if>');
        }
        out.dedent();
        out.w("</set>");
        // 条件
        out.w("<where>");
        out.indent();
        for(var column of table.primeColumns){
            var javaNameU = column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);

            var queryCol  = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                          + utility.rpad("#{entity.key" + javaNameU + "}", table.javaNameMaxLen + "#{entity.key}".length)
            out.w(queryCol);
        }
        out.dedent();
        out.w("</where>");
    }

    function makeDeleteSql(out:ScriptWriter, table: csvload.TableInfo){
        out.w("DELETE FROM");
        // テーブル
        out.indent().w(table.tableName).dedent();
        // 条件
        out.w("<where>");
        out.indent();
        for(var column of table.columns){
            var testQuery = "query." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol  = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                            + utility.rpad("#{query." + column.javaName + "}", table.javaNameMaxLen + "#{query.}".length)
            out.w('<if test="'+testQuery+'">'+queryCol+'</if>');
        }
        out.dedent();
        out.w("</where>");
    }

    function makeDeleteKeySql(out:ScriptWriter, table: csvload.TableInfo){
        out.w("DELETE FROM");
        // テーブル
        out.indent().w(table.tableName).dedent();
        // 条件
        out.w("<where>");
        out.indent();
        for(var column of table.primeColumns){
            var javaNameU = column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
            var queryCol  = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                            + utility.rpad("#{query.key" + javaNameU + "}", table.javaNameMaxLen + "#{query.key}".length)
            out.w(queryCol);
        }
        out.dedent();
        out.w("</where>");
    }

    export function exportJPABean(table: csvload.TableInfo, workDir:string){
        var filebase = makeClassSimpleName(table.tableName, "", "Entity");
        var fqcn = makeClassFullName(table.tableName, "", "Entity");
        var writer=null;
        try{
            writer = new ScriptWriter(objFSO.BuildPath(workDir, filebase + ".java"));

            if(jpack && jpack.length!=0){
                writer.w("package "+ jpack + ";");
                writer.w("");
            }

            exportImport(writer, table, [
				"javax.persistence.Column",
				"javax.persistence.Entity",
				"javax.persistence.Id"
			]);

            writer.w("");
            if(table.logicalName && table.logicalName.length!=0){
                writer.w('/**');
                writer.w(' * '+table.logicalName+'用のBean');
                writer.w(' */');
            }
            writer.w('@Entity(name = "'+ table.tableName + '")');
            writer.w('public class '+ filebase +' {');
            writer.indent();

            // フィールド
            for(var column of table.columns){
                writer.w("/** " + column.logicalName + " */");
                if(column.keyPosition){
                    writer.w('@Id');
                }
                
                writer.w('@Column(name="' +column.columnName + '")');
                writer.w("private " + column.javaTypeSimple + " " + column.javaName + ";");
                writer.w("");
            }

            // セッターとゲッター
            for(var column of table.columns){
                var javaNameU = column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);

                writer.w("/**");
                writer.w(" * " + column.logicalName + "を設定します");
                writer.w(" *");
                writer.w(" * @param " + column.javaName + " " + column.logicalName);
                writer.w(" */");
                writer.w("public void set" + javaNameU + "(" + column.javaTypeSimple + " " + column.javaName + ") {");
                writer.indent();
                writer.w("this." + column.javaName + " = " + column.javaName + ";");
                writer.dedent();
                writer.w("}");
                writer.w("");
                writer.w("/**");
                writer.w(" * " + column.logicalName + "を取得します");
                writer.w(" *");
                writer.w(" * @return " + column.logicalName);
                writer.w(" */");
                writer.w("public " + column.javaTypeSimple + " get" + javaNameU + "() {");
                writer.indent();
                writer.w("return this." + column.javaName + ";");
                writer.dedent();
                writer.w("}");
                writer.w("");
            }

            writer.dedent();
            writer.w('}');

        }finally{
            if(writer) writer.close();
        }

    }
}

/*
 *  CSVファイル ⇒ テーブル情報 
 */
var tableInfo:Array<csvload.TableInfo> = csvload.loadcsv(objFSO, csvFile, COLTYPE_JAVATYPE);

if(mode === "MyBatis" || mode === "ALL"){
    // こんなのを使わずに MyBatis Generatorを使えばいいのに、、、
    for(var table of tableInfo){
        gen.exportMyBatisMapper(table, workDir);
        gen.exportMyBatisMapperXml(table, workDir);
    }
}
if(mode === "JPA" || mode === "ALL"){
    for(var table of tableInfo){
        gen.exportJPABean(table, workDir);
    }    
}

WScript.Echo("処理完了")
