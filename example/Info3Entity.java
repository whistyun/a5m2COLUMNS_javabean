package jp.co.java_conf.tyun.mybatistest;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;

@Entity(name = "info3")
public class Info3Entity {
    /** 手記1 */
    @Id
    @Column(name="id_1")
    private BigDecimal id1;
    
    /** 手記2 */
    @Id
    @Column(name="id_2")
    private String id2;
    
    /** カラムa */
    @Column(name="col_a")
    private Date colA;
    
    /** カラムb */
    @Column(name="col_b")
    private Timestamp colB;
    
    /** カラムc */
    @Column(name="col_c")
    private String colC;
    
    /** Column, in"fo here */
    @Column(name="Tes2t")
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
