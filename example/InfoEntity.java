package jp.co.java_conf.tyun.mybatistest;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;

/**
 * あ用のBean
 */
@Entity(name = "info")
public class InfoEntity {
    /** Column info here */
    @Column(name="Test")
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
