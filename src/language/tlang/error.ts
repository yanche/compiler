
export enum ErrorCode {
    DUP_CLASS_DEFINITION = 10000,
    DUP_FN_DEFINITION = 10001,
    CLASS_NOTFOUND = 10002,
    TYPE_NOTFOUND = 10003,
    DUP_FIELD_DEFINITION = 10004,
    DUP_METHOD_DEFINITION = 10005,
    ENTRY_NOTFOUND = 10006,
    ENTRY_RETURNS_VOID = 10007,
    CLASS_LOOP_INHERITANCE = 10008,
    METHOD_OVERRIDE_RETURN_TYPE = 10009,
    PARENT_HAS_FIELD = 10010,
    NOT_ALWAYS_RETURN = 10011,
    UNREACHABLE_PATH = 10012,
    THIS_AS_VARNAME = 10013,
    DUP_VARIABLE = 10014,
    COND_TAKES_BOOL = 10015,
    FN_RETURN_MISMATCH = 10016,
    TYPE_ASSIGN_MISMATCH = 10017,
    BREAK_OUTSIDE_LOOP = 10018,
    CONTINUE_OUTSIDE_LOOP = 10019,
    NOT_BOOL_FOR_BOOL_OP = 10020,
    CANNOT_COMPARE_VAR = 10021,
    NOT_INT_FOR_INT_OP = 10022,
    FN_NOTFOUND = 10023,
    FN_AMBIGUOUS = 10024,
    METHOD_NOTFOUND = 10025,
    METHOD_AMBIGUOUS = 10026,
    SUPER_OUTSIDE_CONSTRUCTOR = 10027,
    ARRAY_NO_METHOD = 10028,
    PRIMITIVE_NO_METHOD = 10029,
    VAR_NOTFOUND = 10030,
    NOT_AN_ARRAY = 10031,
    NOT_A_CLASS = 10033,
    FIELD_NOTFOUND = 10034,
    ARRAY_CONSTRUCTOR_PARAMS = 10035,
    VAR_USED_BEFORE_DECLARED = 10036,
    DUP_CONSTRUCTOR_DEFINITION = 100037,
}