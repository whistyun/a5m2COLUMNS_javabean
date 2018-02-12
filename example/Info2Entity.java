package jp.co.java_conf.tyun.mybatistest;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;

/**
 * い用のBean
 */
@Entity(name = "info2")
public class Info2Entity {
    /** Column info here */
    @Column(name="Test")
    private String test;
    
    /** Column, in"fo here */
    @Column(name="Tes2t")
    private Boolean tes2t;
    
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
