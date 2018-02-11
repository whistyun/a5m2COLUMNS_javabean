/* ************************************************** *\
 * 
 * �o�͐ݒ�FDB�J�����̃f�[�^�^�ƁA�I�u�W�F�N�g�̌^�̃}�b�s���O
 * 
\* ************************************************** */

/** �o�͎��̃p�b�P�[�W */
var JAVA_PACKAGE = "com.example";

/** 
 * �o�̓��[�h
 * "MyBatis", "JPA", "ALL"
 */
var OUTPUT_MODE = "ALL";

/** DB�J�����̃f�[�^�^�ƁA�I�u�W�F�N�g�̌^�̃}�b�s���O */
var COLTYPE_JAVATYPE ={
    //���l
    "tinyint(1)" : "Boolean",                // �F��D���t���O�B��̂̏ꍇ�͋敪�l�̕ʖ��B���`�ɔ����A2�l(0/1�Ƃ��A1/2�Ƃ��AY/N�Ƃ�)�ɂȂ�Ȃ��B
    "bit"        : "Boolean",                // �F��D���t���O�B��̂̏ꍇ�͋敪�l�̕ʖ��B���`�ɔ����A2�l(0/1�Ƃ��A1/2�Ƃ��AY/N�Ƃ�)�ɂȂ�Ȃ��B
    "number"     : "java.math.BigDecimal",
    "decimal"    : "java.math.BigDecimal",
    "double"     : "java.math.BigDecimal",
    "float"      : "java.math.BigDecimal",
    //������
    "char"       : "String",                 // �R�[�h�l�ɗ��p����邱�Ƃ�����char�ADDL��̌����ɑ΂��āA�g���R�[�h�̒��������������Ƃ��悭����
    "varchar"    : "String",
    "varchar2"   : "String",
    //���t�E����
    "time"       : "java.sql.Time",
    "date"       : "java.sql.Date",
    "timestamp"  : "java.sql.Timestamp",
    "datetime"   : "java.sql.Timestamp",     // SQLServer��DateTime�͌����ځAms�܂Ő��x������悤�Ɍ����A���ۂ́A3.5ms�ʂ̐��x(0ms, 3ms, 7ms)�����Ȃ��B
    "datetime2"  : "java.sql.Timestamp"
}

/* ************************************************** *\
 *
 * �ȉ��A�����{��
 *
\* ************************************************** */
// �`�F�b�N�F�����͎w�肳��Ă���H
if (WScript.Arguments.length < 1) {
    var errMsg = "CSV�t�@�C�����w�肵�Ă�������";
    WScript.Echo(errMsg);
    WScript.Quit(-1);
}
// �`�F�b�N�F�t�@�C���͑��݂���H
var objFSO = new ActiveXObject("Scripting.FileSystemObject");
if (!objFSO.FileExists(WScript.Arguments.Item(0))) {
    var errMsg = "�t�@�C������ł�";
    WScript.Echo(errMsg);
    WScript.Quit(-1);
}
// CSV�t�@�C��(�匳)
var csvFile = WScript.Arguments.Item(0);
// �p�b�P�[�W��
var jpack = JAVA_PACKAGE;
// �o�̓��[�h(JPA, MyBatis)
var mode = OUTPUT_MODE;
// �o�͐�
var workDir = objFSO.GetParentFolderName(csvFile);
var utility;
(function (utility) {
    var Set = /** @class */ (function () {
        function Set() {
            this.hash = [];
            this.array = [];
        }
        Set.prototype.add = function (val) {
            if (!this.hash[val]) {
                this.hash[val] = true;
                this.array.push(val);
            }
        };
        Set.prototype.values = function () {
            return this.array;
        };
        return Set;
    }());
    utility.Set = Set;
    function snake2camel(text, headUpper) {
        var converted = "";
        var sourceStr = text.toLowerCase();
        var idx;
        while ((idx = sourceStr.indexOf("_")) != -1) {
            if (idx + 1 < sourceStr.length) {
                converted += sourceStr.substring(0, idx)
                    + sourceStr.charAt(idx + 1).toUpperCase();
                sourceStr = sourceStr.substring(idx + 2);
            }
            else
                break;
        }
        converted = converted + sourceStr;
        if (headUpper) {
            converted = converted.charAt(0).toUpperCase() + converted.substring(1);
        }
        return converted;
    }
    utility.snake2camel = snake2camel;
    function rpad(text, len) {
        var buff = text;
        while (buff.length <= len) {
            buff = buff + " ";
        }
        return buff;
    }
    utility.rpad = rpad;
    function rpeatPad(len) {
        return rpad("", len);
    }
    utility.rpeatPad = rpeatPad;
})(utility || (utility = {}));
/** �t�@�C���ǂݍ��݂Ɋւ���p�b�P�[�W */
var csvload;
(function (csvload) {
    /** �e�[�u���̏�� */
    var TableInfo = /** @class */ (function () {
        function TableInfo(tableName, tableDescription, columns) {
            this.tableName = tableName;
            this.logicalName = tableDescription;
            this.columns = [];
            this.columnNameMaxLen = 0;
            this.javaNameMaxLen = 0;
            for (var _i = 0, columns_1 = columns; _i < columns_1.length; _i++) {
                var col = columns_1[_i];
                if (col) {
                    this.columns.push(col);
                    this.columnNameMaxLen = Math.max(this.columnNameMaxLen, col.columnName.length);
                    this.javaNameMaxLen = Math.max(this.columnNameMaxLen, col.javaName.length);
                }
            }
        }
        return TableInfo;
    }());
    csvload.TableInfo = TableInfo;
    /** �J�����̏�� */
    var ColumnInfo = /** @class */ (function () {
        function ColumnInfo(columnName, columnType, logicalName, keypos, typeConvertMap) {
            this.keyPosition = keypos;
            this.columnName = columnName;
            this.columnType = columnType;
            this.logicalName = logicalName;
            this.javaName = utility.snake2camel(columnName, false);
            this.javaType = typeConvertMap[columnType.toLowerCase()];
            if (!this.javaType) {
                // �����ł��Ȃ������ꍇ�A��������r�����������ōēx����
                this.javaType = typeConvertMap[columnType.toLowerCase().replace(/\(.+\)/g, "")];
            }
            if (this.javaType) {
                var li = this.javaType.lastIndexOf('.');
                if (li == -1) {
                    this.javaTypeSimple = this.javaType;
                }
                else {
                    this.javaTypeSimple = this.javaType.substring(li + 1);
                }
            }
        }
        return ColumnInfo;
    }());
    csvload.ColumnInfo = ColumnInfo;
    /** FileSystemObject���g�p���A�e�L�X�g�t�@�C��(ShiftJis)�̒��g��ǂݍ��ރN���X */
    var FileSystemObjectLineProp = /** @class */ (function () {
        function FileSystemObjectLineProp(objFso, filePath) {
            this._stream = objFso.OpenTextFile(filePath, 1);
        }
        FileSystemObjectLineProp.prototype.hasNext = function () {
            if (this._next) {
                return true;
            }
            else if (this._stream) {
                if (this._stream.AtEndOfLine) {
                    this._stream.Close();
                    this._stream = null;
                    return false;
                }
                this._next = this._stream.ReadLine();
                return true;
            }
            return false;
        };
        FileSystemObjectLineProp.prototype.next = function () {
            try {
                if (this._next) {
                    return this._next;
                }
                else {
                    throw "call hasNext please";
                }
            }
            finally {
                this._next = null;
            }
        };
        FileSystemObjectLineProp.prototype.close = function () {
            if (this._stream) {
                this._next = null;
                this._stream.Close();
                this._stream = null;
            }
        };
        return FileSystemObjectLineProp;
    }());
    /** Split���܂��܂��ȁACSV�̈Ӗ��𗝉����Ă���CSV�p�[�T */
    var PJCsvRead = /** @class */ (function () {
        function PJCsvRead(sep) {
            this._provider = sep;
        }
        PJCsvRead.prototype.hasNext = function () {
            if (!this._next) {
                if (this._provider.hasNext()) {
                    var line = this._provider.next();
                    var elems = line.split(",");
                    this._next = [];
                    for (var idx = 0; idx < elems.length; ++idx) {
                        var elem = elems[idx];
                        //�擪���A"�Ŏn�܂�Ȃ�A�A�A
                        if (elem.length !== 0 && elem.charAt(0) === "\"") {
                            // "�̐��������ɂȂ�܂ŁA�����������s��
                            while ((elem.match(/"/g) || []).length % 2 == 1) {
                                var sep = ",";
                                if (idx + 1 >= elems.length) {
                                    // �z���H���Ԃ�����A���̍s�̃f�[�^��ǂݍ���
                                    if (this._provider.hasNext()) {
                                        sep = "\n";
                                        // �z�񉄒�
                                        var nelems = this._provider.next().split(",");
                                        for (var idx2 = 0; idx2 < nelems.length; ++idx2) {
                                            elems.push(nelems[idx2]);
                                        }
                                    }
                                    else
                                        throw "CSV�t�H�[�}�b�g�G���[";
                                }
                                elem = elem + sep + elems[++idx];
                            }
                        }
                        if (elem.charAt(0) == "\"" && elem.charAt(elem.length - 1) == "\"") {
                            if (/^"+$/.test(elem) || elem.search(/[^"]/) % 2 == 1) {
                                // �h�݂̂ɂ�镶�� �������́A �擪��"����񑱂�
                                elem = elem.substring(1, elem.length - 1);
                            }
                        }
                        elem = elem.replace(/""/g, "\"");
                        this._next.push(elem);
                    }
                    return true;
                }
                else {
                    return false;
                }
            }
        };
        PJCsvRead.prototype.next = function () {
            try {
                if (this._next) {
                    return this._next;
                }
                else {
                    throw "call hasNext please";
                }
            }
            finally {
                this._next = null;
            }
        };
        PJCsvRead.prototype.close = function () {
            if (this._provider) {
                this._provider.close();
                this._next = null;
            }
        };
        return PJCsvRead;
    }());
    function loadTableDescription(objFSO, tableCsvFile) {
        if (!objFSO.FileExists(tableCsvFile)) {
            // ���񂴂����Ȃ��ꍇ�͉������Ȃ�
            return {};
        }
        var linesp = null;
        var csvparser = null;
        try {
            linesp = new FileSystemObjectLineProp(objFSO, tableCsvFile);
            csvparser = new PJCsvRead(linesp);
            var headmap = {};
            if (csvparser.hasNext()) {
                // �w�b�_�Ǎ�
                var elements = csvparser.next();
                for (var idx = 0; idx < elements.length; ++idx) {
                    switch (elements[idx].toUpperCase()) {
                        case "TABLE_NAME":
                            headmap["TABLE_NAME"] = idx;
                            break;
                        case "LOGICAL_NAME":
                            headmap["LOGICAL_NAME"] = idx;
                            break;
                    }
                }
            }
            else {
                // ���񂴂����Ȃ��ꍇ�͉������Ȃ�
                return {};
            }
            // �{�f�B���ǂݍ���            
            var tableDescription = {};
            while (csvparser.hasNext()) {
                var elements = csvparser.next();
                var tableName = elements[headmap["TABLE_NAME"]];
                var logicalName = elements[headmap["LOGICAL_NAME"]];
                tableDescription[tableName] = logicalName;
            }
            return tableDescription;
        }
        finally {
            if (csvparser) {
                csvparser.close();
                csvparser = null;
            }
            else if (linesp) {
                linesp.close();
                linesp = null;
            }
        }
    }
    function loadcsv(objFSO, csvFile, typeConvertMap) {
        var linesp = null;
        var csvparser = null;
        // �ua5m2_COLUMNS.csv�v�ȊO�ɁA�ua5m2_TABLES.csv�v������ꍇ�́A
        // ��������ǂݍ���
        var tableCsvFile = objFSO.BuildPath(objFSO.GetParentFolderName(csvFile), "a5m2_TABLES.csv");
        var tableDescription = loadTableDescription(objFSO, tableCsvFile);
        try {
            linesp = new FileSystemObjectLineProp(objFSO, csvFile);
            csvparser = new PJCsvRead(linesp);
            // �w�b�_���ǂݍ���
            var headmap = {};
            if (csvparser.hasNext()) {
                var elements = csvparser.next();
                for (var idx = 0; idx < elements.length; ++idx) {
                    switch (elements[idx].toUpperCase()) {
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
            else {
                WScript.Echo("ERROR: �t�@�C������ł�");
                WScript.Quit(-1);
            }
            // �{�f�B���ǂݍ���
            var tableNames = [];
            var tableInfoBuild = {};
            while (csvparser.hasNext()) {
                var elements = csvparser.next();
                var ordianlIdx = elements[headmap["ORDINAL_POSITION"]];
                var tableName = elements[headmap["TABLE_NAME"]];
                var columnName = elements[headmap["COLUMN_NAME"]];
                var logicalName = elements[headmap["LOGICAL_NAME"]];
                var columnType = elements[headmap["DATA_TYPE"]];
                var keypos = elements[headmap["KEY_POSITION"]];
                var arry = tableInfoBuild[tableName];
                if (!arry) {
                    arry = [];
                    tableNames.push(tableName);
                    tableInfoBuild[tableName] = arry;
                }
                arry[ordianlIdx] = new ColumnInfo(columnName, columnType, logicalName, keypos, typeConvertMap);
            }
            // TableInfo�̐���
            var tableInfo = [];
            for (var _i = 0, tableNames_1 = tableNames; _i < tableNames_1.length; _i++) {
                var table = tableNames_1[_i];
                tableInfo.push(new TableInfo(table, tableDescription[table], tableInfoBuild[table]));
            }
            return tableInfo;
        }
        finally {
            if (csvparser) {
                csvparser.close();
            }
            else if (linesp) {
                linesp.close();
            }
        }
    }
    csvload.loadcsv = loadcsv;
})(csvload || (csvload = {}));
/** �t�@�C���o�͂Ɋւ���p�b�P�[�W */
var gen;
(function (gen) {
    var UTF8FileWriter = /** @class */ (function () {
        function UTF8FileWriter(filename) {
            this.filename = filename;
            this.pre = new ActiveXObject("ADODB.Stream");
            this.pre.Type = 2;
            this.pre.Charset = 'UTF-8';
            this.pre.Open();
        }
        UTF8FileWriter.prototype.write = function (text) {
            this.pre.WriteText(text);
        };
        UTF8FileWriter.prototype.newLine = function () {
            this.pre.WriteText("\r\n");
        };
        UTF8FileWriter.prototype.close = function () {
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
        };
        return UTF8FileWriter;
    }());
    /** �X�N���v�g�o�͗p�N���X */
    var ScriptWriter = /** @class */ (function () {
        function ScriptWriter(filename) {
            this.writer = new UTF8FileWriter(filename);
            this.pretab = "";
        }
        ScriptWriter.prototype.indent = function () {
            this.pretab += "    ";
            return this;
        };
        ;
        ScriptWriter.prototype.dedent = function () {
            this.pretab = this.pretab.substring(4);
            return this;
        };
        ;
        ScriptWriter.prototype.w = function (text) {
            this.writer.write(this.pretab);
            this.writer.write(text);
            this.writer.newLine();
            return this;
        };
        ScriptWriter.prototype.close = function () {
            this.writer.close();
        };
        return ScriptWriter;
    }());
    gen.ScriptWriter = ScriptWriter;
    function exportMyBatisMapper(table, workDir) {
        var filebase = makeClassSimpleName(table.tableName, "Mapper", "");
        var fqcn = makeClassFullName(table.tableName, "Mapper", "");
        var writer = null;
        try {
            writer = new ScriptWriter(objFSO.BuildPath(workDir, filebase + ".java"));
            if (jpack && jpack.length != 0) {
                writer.w("package " + jpack + ";");
                writer.w("");
            }
            exportImport(writer, table, [
                "java.io.Serializable",
                "java.util.List",
                "org.apache.ibatis.annotations.Param"
            ]);
            writer.w("");
            if (table.logicalName && table.logicalName.length != 0) {
                writer.w('/**');
                writer.w(' * ' + table.logicalName + '�p�̃}�b�p�[');
                writer.w(' */');
            }
            writer.w("public interface " + filebase + " {");
            writer.indent();
            writer.w('/**');
            writer.w(' * SELECT��');
            writer.w(' *');
            writer.w(' * @param query ��������');
            writer.w(' *');
            writer.w(' * @return ��������');
            writer.w(' */');
            writer.w('List<Entity> select(@Param("query") Entity query);');
            writer.w("");
            writer.w('/**');
            writer.w(' * INSERT��');
            writer.w(' *');
            writer.w(' * @param insert �}������');
            writer.w(' *');
            writer.w(' * @return �o�^�s��');
            writer.w(' */');
            writer.w('List<Entity> insert(@Param("insert") Entity insert);');
            writer.w("");
            writer.w('/**');
            writer.w(' * UPDATE��');
            writer.w(' *');
            writer.w(' * @param update �X�V����');
            writer.w(' * @param query �X�V����');
            writer.w(' *');
            writer.w(' * @return �X�V�s��');
            writer.w(' */');
            writer.w('int updateQuery(@Param("update") Entity update, @Param("query") Entity query);');
            writer.w("");
            writer.w('/**');
            writer.w(' * DELETE��');
            writer.w(' *');
            writer.w(' * @param query �폜����');
            writer.w(' *');
            writer.w(' * @return �폜����');
            writer.w(' */');
            writer.w('int deleteQuery(@Param("query") Entity query);');
            writer.w("");
            writer.w('/**');
            writer.w(' * �e�[�u���̍s���������߂�Bean�N���X');
            writer.w(' */');
            writer.w('public static Entity implements Serializable {');
            writer.indent();
            // �t�B�[���h
            for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
                var column = _a[_i];
                writer.w("/** " + column.logicalName + " */");
                writer.w("private " + column.javaTypeSimple + " " + column.javaName + ";");
                writer.w("");
            }
            // �Z�b�^�[�ƃQ�b�^�[
            for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
                var column = _c[_b];
                var javaNameU = column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
                writer.w("/**");
                writer.w(" * " + column.logicalName + "��ݒ肵�܂�");
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
                writer.w(" * " + column.logicalName + "���擾���܂�");
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
        }
        finally {
            if (writer)
                writer.close();
        }
    }
    gen.exportMyBatisMapper = exportMyBatisMapper;
    function exportImport(writer, table, additional) {
        var set = new utility.Set();
        for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            if (column.javaType.indexOf(".") != -1) {
                set.add(column.javaType);
            }
        }
        for (var _b = 0, additional_1 = additional; _b < additional_1.length; _b++) {
            var add = additional_1[_b];
            set.add(add);
        }
        for (var _c = 0, _d = set.values().sort(); _c < _d.length; _c++) {
            var importClass = _d[_c];
            writer.w("import " + importClass + ";");
        }
    }
    function exportMyBatisMapperXml(table, workDir) {
        var filebase = makeClassSimpleName(table.tableName, "Mapper", "");
        var fqcn = makeClassFullName(table.tableName, "Mapper", "");
        var writer = null;
        try {
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
            writer.w("</mapper>");
        }
        finally {
            if (writer)
                writer.close();
        }
    }
    gen.exportMyBatisMapperXml = exportMyBatisMapperXml;
    function makeClassSimpleName(tableName, classNamePrefix, classNameSuffix) {
        var buff = "";
        if (classNamePrefix) {
            buff += classNamePrefix;
        }
        buff += utility.snake2camel(tableName, true);
        if (classNameSuffix) {
            buff += classNameSuffix;
        }
        return buff;
    }
    function makeClassFullName(tableName, classNamePrefix, classNameSuffix) {
        var buff = "";
        if (jpack && jpack.length != 0) {
            buff += jpack + ".";
        }
        buff += makeClassSimpleName(tableName, classNamePrefix, classNameSuffix);
        return buff;
    }
    function makeResultMapping(out, table) {
        for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            var columnIndent = utility.rpeatPad(table.columnNameMaxLen - column.columnName.length + 1);
            var propertyIndent = utility.rpeatPad(table.javaNameMaxLen - column.javaName.length + 1);
            if (column.keyPosition) {
                out.w('<id     column="' + column.columnName + '" ' + columnIndent + ' property="' + column.javaName + '"' + propertyIndent + '/>');
            }
            else {
                out.w('<result column="' + column.columnName + '" ' + columnIndent + ' property="' + column.javaName + '"' + propertyIndent + '/>');
            }
        }
    }
    function makeSelectSql(out, table) {
        out.w("SELECT");
        // �J����
        out.indent();
        var firstColumn = true;
        for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            var prefix = firstColumn ? " " : ",";
            out.w(prefix + column.columnName);
            firstColumn = false;
        }
        out.dedent();
        // �e�[�u��
        out.w("FROM");
        out.indent().w(table.tableName).dedent();
        // ����
        out.w("<where>");
        out.indent();
        for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
            var column = _c[_b];
            var testQuery = "query." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                + utility.rpad("#{query." + column.javaName + "}", table.javaNameMaxLen + "#{query.}".length);
            out.w('<if test="' + testQuery + '">' + queryCol + '</if>');
        }
        out.dedent();
        out.w("</where>");
    }
    function makeInsertSql(out, table) {
        out.w("INSERT INTO");
        out.indent().w(table.tableName).dedent();
        out.w("(");
        out.indent();
        var firstColumn = true;
        for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            var prefix = firstColumn ? " " : ",";
            out.w(prefix + column.columnName);
            firstColumn = false;
        }
        out.dedent();
        out.w(") VALUES (");
        out.indent();
        var firstValue = true;
        for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
            var column = _c[_b];
            var prefix = firstValue ? " " : ",";
            out.w(prefix + "#{entity." + column.javaName + "}");
            firstValue = false;
        }
        out.dedent();
        out.w(")");
    }
    function makeUpdateSql(out, table) {
        out.w("UPDATE");
        out.indent().w(table.tableName).dedent();
        // �X�V����
        out.w("<set>");
        out.indent();
        for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            var testQuery = "entity." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol = utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                + utility.rpad("#{entity." + column.javaName + "}", table.javaNameMaxLen + "#{entity.}".length);
            out.w('<if test="' + testQuery + '">' + queryCol + ' , </if>');
        }
        out.dedent();
        out.w("</set>");
        // ����
        out.w("<where>");
        out.indent();
        for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
            var column = _c[_b];
            var testQuery = "query." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                + utility.rpad("#{query." + column.javaName + "}", table.javaNameMaxLen + "#{query.}".length);
            out.w('<if test="' + testQuery + '">' + queryCol + '</if>');
        }
        out.dedent();
        out.w("</where>");
    }
    function makeDeleteSql(out, table) {
        out.w("DELETE FROM");
        // �e�[�u��
        out.indent().w(table.tableName).dedent();
        // ����
        out.w("<where>");
        out.indent();
        for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            var testQuery = "query." + utility.rpad(column.javaName, table.javaNameMaxLen) + "!= null ";
            var queryCol = "AND " + utility.rpad(column.columnName, table.columnNameMaxLen) + " = "
                + utility.rpad("#{query." + column.javaName + "}", table.javaNameMaxLen + "#{query.}".length);
            out.w('<if test="' + testQuery + '">' + queryCol + '</if>');
        }
        out.dedent();
        out.w("</where>");
    }
    function exportJPABean(table, workDir) {
        var filebase = makeClassSimpleName(table.tableName, "", "Entity");
        var fqcn = makeClassFullName(table.tableName, "", "Entity");
        var writer = null;
        try {
            writer = new ScriptWriter(objFSO.BuildPath(workDir, filebase + ".java"));
            if (jpack && jpack.length != 0) {
                writer.w("package " + jpack + ";");
                writer.w("");
            }
            exportImport(writer, table, [
                "javax.persistence.Column",
                "javax.persistence.Entity",
                "javax.persistence.Id"
            ]);
            writer.w("");
            if (table.logicalName && table.logicalName.length != 0) {
                writer.w('/**');
                writer.w(' * ' + table.logicalName + '�p��Bean');
                writer.w(' */');
            }
            writer.w('@Entity(name = "' + table.tableName + '")');
            writer.w('public static ' + filebase + ' {');
            writer.indent();
            // �t�B�[���h
            for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
                var column = _a[_i];
                writer.w("/** " + column.logicalName + " */");
                if (column.keyPosition) {
                    writer.w('@Id(name="' + column.columnName + '")');
                }
                else {
                    writer.w('@Column(name="' + column.columnName + '")');
                }
                writer.w("private " + column.javaTypeSimple + " " + column.javaName + ";");
                writer.w("");
            }
            // �Z�b�^�[�ƃQ�b�^�[
            for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
                var column = _c[_b];
                var javaNameU = column.javaName.charAt(0).toUpperCase() + column.javaName.substring(1);
                writer.w("/**");
                writer.w(" * " + column.logicalName + "��ݒ肵�܂�");
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
                writer.w(" * " + column.logicalName + "���擾���܂�");
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
        }
        finally {
            if (writer)
                writer.close();
        }
    }
    gen.exportJPABean = exportJPABean;
})(gen || (gen = {}));
/*
 *  CSV�t�@�C�� �� �e�[�u�����
 */
var tableInfo = csvload.loadcsv(objFSO, csvFile, COLTYPE_JAVATYPE);
if (mode === "MyBatis" || mode === "ALL") {
    // ����Ȃ̂��g�킸�� MyBatis Generator���g���΂����̂ɁA�A�A
    for (var _i = 0, tableInfo_1 = tableInfo; _i < tableInfo_1.length; _i++) {
        var table = tableInfo_1[_i];
        gen.exportMyBatisMapper(table, workDir);
        gen.exportMyBatisMapperXml(table, workDir);
    }
}
if (mode === "JPA" || mode === "ALL") {
    for (var _a = 0, tableInfo_2 = tableInfo; _a < tableInfo_2.length; _a++) {
        var table = tableInfo_2[_a];
        gen.exportJPABean(table, workDir);
    }
}
WScript.Echo("��������");
//# sourceMappingURL=makesql.js.map