package jp.co.java_conf.tyun.mybatistest;

import java.io.Serializable;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface MapperInfo3 {
    /**
     * SELECT文
     *
     * @param query 検索条件
     *
     * @return 検索結果
     */
    List<EntityWithKey> select(@Param("query") Entity query);
    
    /**
     * INSERT文
     *
     * @param entity 挿入項目
     *
     * @return 登録行数
     */
    int insert(@Param("entity") Entity entity);
    
    /**
     * UPDATE文
     *
     * @param entity 更新項目
     *
     * @return 更新行数
     */
    int updateByKey(@Param("entity") EntityWithKey entity);
    
    /**
     * DELETE文
     *
     * @param query 削除条件
     *
     * @return 削除件数
     */
    int deleteByKey(@Param("query") EntityWithKey query);
    
    /**
     * UPDATE文
     *
     * @param entity 更新項目
     * @param query 更新条件
     *
     * @return 更新行数
     */
    int updateByQuery(@Param("entity") Entity entity, @Param("query") Entity query);
    
    /**
     * DELETE文
     *
     * @param query 削除条件
     *
     * @return 削除件数
     */
    int deleteByQuery(@Param("query") Entity query);
    
    /**
     * INSERT MULTIPLE ROW文
     *
     * @param insertList 登録対象一覧
     *
     * @return 登録件数
     */
    int insertMulti(@Param("insertList") List<? extends Entity> insertList);
    
    /**
     * テーブルの行を示すためのBeanクラス
     */
    public static class Entity implements Serializable {
        /** 手記1 */
        private BigDecimal id1;
        
        /** 手記2 */
        private String id2;
        
        /** カラムa */
        private Date colA;
        
        /** カラムb */
        private Timestamp colB;
        
        /** カラムc */
        private String colC;
        
        /** Column, in"fo here */
        private Boolean tes2t;
        
        /**
         * 手記1を設定します
         *
         * @param id1 手記1
         */
        public void setId1(BigDecimal id1) {
            this.id1 = id1;
        }
        
        /**
         * 手記1を取得します
         *
         * @return 手記1
         */
        public BigDecimal getId1() {
            return this.id1;
        }
        
        /**
         * 手記2を設定します
         *
         * @param id2 手記2
         */
        public void setId2(String id2) {
            this.id2 = id2;
        }
        
        /**
         * 手記2を取得します
         *
         * @return 手記2
         */
        public String getId2() {
            return this.id2;
        }
        
        /**
         * カラムaを設定します
         *
         * @param colA カラムa
         */
        public void setColA(Date colA) {
            this.colA = colA;
        }
        
        /**
         * カラムaを取得します
         *
         * @return カラムa
         */
        public Date getColA() {
            return this.colA;
        }
        
        /**
         * カラムbを設定します
         *
         * @param colB カラムb
         */
        public void setColB(Timestamp colB) {
            this.colB = colB;
        }
        
        /**
         * カラムbを取得します
         *
         * @return カラムb
         */
        public Timestamp getColB() {
            return this.colB;
        }
        
        /**
         * カラムcを設定します
         *
         * @param colC カラムc
         */
        public void setColC(String colC) {
            this.colC = colC;
        }
        
        /**
         * カラムcを取得します
         *
         * @return カラムc
         */
        public String getColC() {
            return this.colC;
        }
        
        /**
         * Column, in"fo hereを設定します
         *
         * @param tes2t Column, in"fo here
         */
        public void setTes2t(Boolean tes2t) {
            this.tes2t = tes2t;
        }
        
        /**
         * Column, in"fo hereを取得します
         *
         * @return Column, in"fo here
         */
        public Boolean getTes2t() {
            return this.tes2t;
        }
        
    }
    
    /**
     * テーブルの行を示すためのBeanクラス
     */
    public static class EntityWithKey extends Entity implements Serializable {
        private BigDecimal keyId1;
        private String keyId2;
        
        public EntityWithKey(BigDecimal keyId1, String keyId2) {
            this.keyId1 = keyId1;
            this.keyId2 = keyId2;
        }
        /**
         * 手記1を設定します
         *
         * @param id1 手記1
         */
        public void setKeyId1(BigDecimal id1) {
            this.keyId1 = id1;
        }
        
        /**
         * 手記1を取得します
         *
         * @return 手記1
         */
        public BigDecimal getKeyId1() {
            return this.keyId1;
        }
        
        /**
         * 手記2を設定します
         *
         * @param id2 手記2
         */
        public void setKeyId2(String id2) {
            this.keyId2 = id2;
        }
        
        /**
         * 手記2を取得します
         *
         * @return 手記2
         */
        public String getKeyId2() {
            return this.keyId2;
        }
        
    }
}
