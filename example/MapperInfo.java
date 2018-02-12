package jp.co.java_conf.tyun.mybatistest;

import java.io.Serializable;
import java.util.List;
import org.apache.ibatis.annotations.Param;

/**
 * あ用のマッパー
 */
public interface MapperInfo {
    /**
     * SELECT文
     *
     * @param query 検索条件
     *
     * @return 検索結果
     */
    List<Entity> select(@Param("query") Entity query);
    
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
        /** Column info here */
        private String test;
        
        /**
         * Column info hereを設定します
         *
         * @param test Column info here
         */
        public void setTest(String test) {
            this.test = test;
        }
        
        /**
         * Column info hereを取得します
         *
         * @return Column info here
         */
        public String getTest() {
            return this.test;
        }
        
    }
}
