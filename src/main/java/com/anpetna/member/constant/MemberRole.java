package com.anpetna.member.constant;

public enum MemberRole {
    USER, ADMIN, BLACKLIST;
    public String authority() { return "ROLE_" + name(); }
}
