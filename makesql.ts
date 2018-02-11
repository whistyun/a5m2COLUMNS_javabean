/* ************************************************** *\
 * 
 * 出力設定：DBカラムのデータ型と、オブジェクトの型のマッピング
 * 
\* ************************************************** */

/** 出力時のパッケージ */
var JAVA_PACKAGE = "com.example";

/** 出力モード
 * "MyBatis", "JPA", "ALL"
 */
var OUTPUT_MODE = "ALL";

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
    "char"       : "String",                 // コード値に利用されることがあるchar、DDL上の桁数に対して、使うコードの長さが小さいことがよくある
    "varchar"    : "String",
    "varchar2"   : "String",
    //日付・時刻
    "time"       : "java.sql.Time",
    "date"       : "java.sql.Date",
    "timestamp"  : "java.sql.Timestamp",
    "datetime"   : "java.sql.Timestamp",     // SQLServerのDateTimeは見た目、msまで精度があるように見え、実際は、3.5ms位の精度(0ms, 3ms, 7ms)しかない。
    "datetime2"  : "java.sql.Timestamp"
}

/* ************************************************** *\
 * 
 * 以下、処理本文
 * 
\* ************************************************** */

// チェック：引数は指定されている？
if(WScript.Arguments.length < 1){
    var errMsg = "CSVファイルを指定してください";
    WScript.Echo(errMsg);
    WScript.Quit(-1);
}

// チェック：ファイルは存在する？
var objFSO = new ActiveXObject("Scripting.FileSystemObject");
if( !objFSO.FileExists(WScript.Arguments.Item(0)) ){
    var errMsg = "ファイルが空です";
    WScript.Echo(errMsg);
    WScript.Quit(-1);
}

// CSVファイル'
var csvFile = WScript.Arguments.Item(0);
// パッケージ名
var jpack = JAVA_PACKAGE;
// 出力モード(JPA, MyBatis)
var mode = OUTPUT_MODE;
// 出力先
var workDir = objFSO.GetParentFolderName(csvFile);

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
        tableName:string;
        columns:Array<ColumnInfo>;

        columnNameMaxLen:number;
        javaNameMaxLen:number;

        constructor(tableName:string, columns:Array<ColumnInfo>){
            this.tableName = tableName;
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
        }
    }

    /** カラムの情報 */
    export class ColumnInfo{
        keyPosition   :string;
        columnName    :string;
        columnType    :string;
        logicalName   :string;
        javaName      :string;
        javaType      :string;
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

    export function loadcsv(objFSO:any, csvFile:string, typeConvertMap): Array<TableInfo> {
        var linesp = null;
        var csvparser = null;
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
                arry[ordianlIdx] = new ColumnInfo(columnName, columnType, logicalName, keypos, typeConvertMap);
            }

            // TableInfoの生成
            var tableInfo:Array<TableInfo> =[];
            for(var table of tableNames){
                tableInfo.push(new TableInfo(table, tableInfoBuild[table]));
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
            writer.w("public interface " + filebase + " {");
            writer.indent();

            writer.w('/**');
            writer.w(' * SELECT文');
            writer.w(' *');
            writer.w(' * @param query 検索条件');
            writer.w(' *');
            writer.w(' * @return 検索結果');
            writer.w(' */');
            writer.w('List<Entity> select(@Param("query") Entity query);');
            writer.w("");

            writer.w('/**');
            writer.w(' * INSERT文');
            writer.w(' *');
            writer.w(' * @param insert 挿入項目');
            writer.w(' *');
            writer.w(' * @return 登録行数');
            writer.w(' */');
            writer.w('List<Entity> insert(@Param("insert") Entity insert);');
            writer.w("");

            writer.w('/**');
            writer.w(' * UPDATE文');
            writer.w(' *');
            writer.w(' * @param update 更新項目');
            writer.w(' * @param query 更新条件');
            writer.w(' *');
            writer.w(' * @return 更新行数');
            writer.w(' */');
            writer.w('int updateQuery(@Param("update") Entity update, @Param("query") Entity query);');
            writer.w("");

            writer.w('/**');
            writer.w(' * DELETE文');
            writer.w(' *');
            writer.w(' * @param query 削除条件');
            writer.w(' *');
            writer.w(' * @return 削除件数');
            writer.w(' */');
            writer.w('int deleteQuery(@Param("query") Entity query);');
            writer.w("");

            writer.w('/**');
            writer.w(' * テーブルの行を示すためのBeanクラス');
            writer.w(' */');
            writer.w('public static Entity implements Serializable {');
            writer.indent();

            // フィールド
            for(var column of table.columns){
                writer.w("/** " + column.logicalName + " */");
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
                writer.w("private void set" + javaNameU + "(" + column.javaTypeSimple + " " + column.javaName + ") {");
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
                writer.w("private " + column.javaTypeSimple + " get" + javaNameU + "() {");
                writer.indent();
                writer.w("return this." + column.javaName + ";");
                writer.dedent();
                writer.w("}");
                writer.w("");
            }

            writer.dedent();
            writer.w('}');

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
    
            writer.w("<mapper namespace='" + fqcn + "'>");
            writer.indent();
    
            // ResultMapping
            writer.w('<resultMap id="resultMapEntity" type="' + fqcn + "$Entity" + '">');
            writer.indent();
            makeResultMapping(writer, table);
            writer.dedent();
            writer.w("</resultMap>");
            writer.w("");
    
            // select
            writer.w('<select id="select" resultMap="resultMapEntity">');
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

        out.w(") VALUES (");
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
                          + utility.rpad("#{query." + column.javaName + "}", table.javaNameMaxLen + "#{query.}".length)
            out.w('<if test="'+testQuery+'">'+queryCol+'</if>');
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
            writer.w('@Entity(name = "'+ table.tableName + '")');
            writer.w('public static '+ filebase +' {');
            writer.indent();

            // フィールド
            for(var column of table.columns){
                writer.w("/** " + column.logicalName + " */");
                if(column.keyPosition){
                    writer.w('@Id(name="' +column.columnName + '")')
                }else{
                    writer.w('@Column(name="' +column.columnName + '")')
                }
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
                writer.w("private void set" + javaNameU + "(" + column.javaTypeSimple + " " + column.javaName + ") {");
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
                writer.w("private " + column.javaTypeSimple + " get" + javaNameU + "() {");
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
