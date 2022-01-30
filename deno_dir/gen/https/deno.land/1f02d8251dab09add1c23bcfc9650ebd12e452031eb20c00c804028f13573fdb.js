const nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
const nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
const entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
const entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
export const ENTITIES = {
    amp: '&',
    gt: '>',
    lt: '<',
    quot: '"',
    apos: "'",
    AElig: 198,
    Aacute: 193,
    Acirc: 194,
    Agrave: 192,
    Aring: 197,
    Atilde: 195,
    Auml: 196,
    Ccedil: 199,
    ETH: 208,
    Eacute: 201,
    Ecirc: 202,
    Egrave: 200,
    Euml: 203,
    Iacute: 205,
    Icirc: 206,
    Igrave: 204,
    Iuml: 207,
    Ntilde: 209,
    Oacute: 211,
    Ocirc: 212,
    Ograve: 210,
    Oslash: 216,
    Otilde: 213,
    Ouml: 214,
    THORN: 222,
    Uacute: 218,
    Ucirc: 219,
    Ugrave: 217,
    Uuml: 220,
    Yacute: 221,
    aacute: 225,
    acirc: 226,
    aelig: 230,
    agrave: 224,
    aring: 229,
    atilde: 227,
    auml: 228,
    ccedil: 231,
    eacute: 233,
    ecirc: 234,
    egrave: 232,
    eth: 240,
    euml: 235,
    iacute: 237,
    icirc: 238,
    igrave: 236,
    iuml: 239,
    ntilde: 241,
    oacute: 243,
    ocirc: 244,
    ograve: 242,
    oslash: 248,
    otilde: 245,
    ouml: 246,
    szlig: 223,
    thorn: 254,
    uacute: 250,
    ucirc: 251,
    ugrave: 249,
    uuml: 252,
    yacute: 253,
    yuml: 255,
    copy: 169,
    reg: 174,
    nbsp: 160,
    iexcl: 161,
    cent: 162,
    pound: 163,
    curren: 164,
    yen: 165,
    brvbar: 166,
    sect: 167,
    uml: 168,
    ordf: 170,
    laquo: 171,
    not: 172,
    shy: 173,
    macr: 175,
    deg: 176,
    plusmn: 177,
    sup1: 185,
    sup2: 178,
    sup3: 179,
    acute: 180,
    micro: 181,
    para: 182,
    middot: 183,
    cedil: 184,
    ordm: 186,
    raquo: 187,
    frac14: 188,
    frac12: 189,
    frac34: 190,
    iquest: 191,
    times: 215,
    divide: 247,
    OElig: 338,
    oelig: 339,
    Scaron: 352,
    scaron: 353,
    Yuml: 376,
    fnof: 402,
    circ: 710,
    tilde: 732,
    Alpha: 913,
    Beta: 914,
    Gamma: 915,
    Delta: 916,
    Epsilon: 917,
    Zeta: 918,
    Eta: 919,
    Theta: 920,
    Iota: 921,
    Kappa: 922,
    Lambda: 923,
    Mu: 924,
    Nu: 925,
    Xi: 926,
    Omicron: 927,
    Pi: 928,
    Rho: 929,
    Sigma: 931,
    Tau: 932,
    Upsilon: 933,
    Phi: 934,
    Chi: 935,
    Psi: 936,
    Omega: 937,
    alpha: 945,
    beta: 946,
    gamma: 947,
    delta: 948,
    epsilon: 949,
    zeta: 950,
    eta: 951,
    theta: 952,
    iota: 953,
    kappa: 954,
    lambda: 955,
    mu: 956,
    nu: 957,
    xi: 958,
    omicron: 959,
    pi: 960,
    rho: 961,
    sigmaf: 962,
    sigma: 963,
    tau: 964,
    upsilon: 965,
    phi: 966,
    chi: 967,
    psi: 968,
    omega: 969,
    thetasym: 977,
    upsih: 978,
    piv: 982,
    ensp: 8194,
    emsp: 8195,
    thinsp: 8201,
    zwnj: 8204,
    zwj: 8205,
    lrm: 8206,
    rlm: 8207,
    ndash: 8211,
    mdash: 8212,
    lsquo: 8216,
    rsquo: 8217,
    sbquo: 8218,
    ldquo: 8220,
    rdquo: 8221,
    bdquo: 8222,
    dagger: 8224,
    Dagger: 8225,
    bull: 8226,
    hellip: 8230,
    permil: 8240,
    prime: 8242,
    Prime: 8243,
    lsaquo: 8249,
    rsaquo: 8250,
    oline: 8254,
    frasl: 8260,
    euro: 8364,
    image: 8465,
    weierp: 8472,
    real: 8476,
    trade: 8482,
    alefsym: 8501,
    larr: 8592,
    uarr: 8593,
    rarr: 8594,
    darr: 8595,
    harr: 8596,
    crarr: 8629,
    lArr: 8656,
    uArr: 8657,
    rArr: 8658,
    dArr: 8659,
    hArr: 8660,
    forall: 8704,
    part: 8706,
    exist: 8707,
    empty: 8709,
    nabla: 8711,
    isin: 8712,
    notin: 8713,
    ni: 8715,
    prod: 8719,
    sum: 8721,
    minus: 8722,
    lowast: 8727,
    radic: 8730,
    prop: 8733,
    infin: 8734,
    ang: 8736,
    and: 8743,
    or: 8744,
    cap: 8745,
    cup: 8746,
    int: 8747,
    there4: 8756,
    sim: 8764,
    cong: 8773,
    asymp: 8776,
    ne: 8800,
    equiv: 8801,
    le: 8804,
    ge: 8805,
    sub: 8834,
    sup: 8835,
    nsub: 8836,
    sube: 8838,
    supe: 8839,
    oplus: 8853,
    otimes: 8855,
    perp: 8869,
    sdot: 8901,
    lceil: 8968,
    rceil: 8969,
    lfloor: 8970,
    rfloor: 8971,
    lang: 9001,
    rang: 9002,
    loz: 9674,
    spades: 9824,
    clubs: 9827,
    hearts: 9829,
    diams: 9830,
};
Object.keys(ENTITIES).forEach(key => {
    const e = ENTITIES[key];
    ENTITIES[key] = typeof e === 'number' ? String.fromCharCode(e) : e;
});
export class SAX {
    EVENTS;
    ENTITIES = {
        ...ENTITIES,
    };
    XML_ENTITIES = {
        amp: '&',
        gt: '>',
        lt: '<',
        quot: '"',
        apos: "'",
    };
    S = 0;
    opt;
    trackPosition = false;
    column = 0;
    line = 0;
    c = '';
    error;
    q = '';
    bufferCheckPosition;
    closed = false;
    tags = [];
    looseCase = '';
    closedRoot = false;
    sawRoot = false;
    strict = false;
    tag;
    strictEntities;
    state;
    noscript = false;
    attribList = [];
    ns;
    position = 0;
    STATE = {
        BEGIN: this.S++,
        BEGIN_WHITESPACE: this.S++,
        TEXT: this.S++,
        TEXT_ENTITY: this.S++,
        OPEN_WAKA: this.S++,
        SGML_DECL: this.S++,
        SGML_DECL_QUOTED: this.S++,
        DOCTYPE: this.S++,
        DOCTYPE_QUOTED: this.S++,
        DOCTYPE_DTD: this.S++,
        DOCTYPE_DTD_QUOTED: this.S++,
        COMMENT_STARTING: this.S++,
        COMMENT: this.S++,
        COMMENT_ENDING: this.S++,
        COMMENT_ENDED: this.S++,
        CDATA: this.S++,
        CDATA_ENDING: this.S++,
        CDATA_ENDING_2: this.S++,
        PROC_INST: this.S++,
        PROC_INST_BODY: this.S++,
        PROC_INST_ENDING: this.S++,
        OPEN_TAG: this.S++,
        OPEN_TAG_SLASH: this.S++,
        ATTRIB: this.S++,
        ATTRIB_NAME: this.S++,
        ATTRIB_NAME_SAW_WHITE: this.S++,
        ATTRIB_VALUE: this.S++,
        ATTRIB_VALUE_QUOTED: this.S++,
        ATTRIB_VALUE_CLOSED: this.S++,
        ATTRIB_VALUE_UNQUOTED: this.S++,
        ATTRIB_VALUE_ENTITY_Q: this.S++,
        ATTRIB_VALUE_ENTITY_U: this.S++,
        CLOSE_TAG: this.S++,
        CLOSE_TAG_SAW_WHITE: this.S++,
        SCRIPT: this.S++,
        SCRIPT_ENDING: this.S++,
    };
    BUFFERS;
    parser;
    CDATA = '[CDATA[';
    DOCTYPE = 'DOCTYPE';
    XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
    XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
    rootNS = {
        xml: this.XML_NAMESPACE,
        xmlns: this.XMLNS_NAMESPACE,
    };
    comment;
    sgmlDecl;
    textNode = '';
    tagName;
    doctype;
    procInstName;
    procInstBody;
    entity = '';
    attribName;
    attribValue;
    cdata = '';
    script = '';
    startTagPosition = 0;
    constructor() {
        this.BUFFERS = [
            'comment',
            'sgmlDecl',
            'textNode',
            'tagName',
            'doctype',
            'procInstName',
            'procInstBody',
            'entity',
            'attribName',
            'attribValue',
            'cdata',
            'script',
        ];
        this.EVENTS = [
            'text',
            'processinginstruction',
            'sgmldeclaration',
            'doctype',
            'comment',
            'opentagstart',
            'attribute',
            'opentag',
            'closetag',
            'opencdata',
            'cdata',
            'closecdata',
            'error',
            'end',
            'ready',
            'script',
            'opennamespace',
            'closenamespace',
        ];
        this.S = 0;
        for (const s in this.STATE) {
            if (this.STATE.hasOwnProperty(s)) {
                this.STATE[this.STATE[s]] = s;
            }
        }
        this.S = this.STATE;
        this.parser = (strict, opt) => new SAXParser(strict, opt);
    }
    static charAt(chunk, i) {
        let result = '';
        if (i < chunk.length) {
            result = chunk.charAt(i);
        }
        return result;
    }
    static isWhitespace(c) {
        return c === ' ' || c === '\n' || c === '\r' || c === '\t';
    }
    static isQuote(c) {
        return c === '"' || c === "'";
    }
    static isAttribEnd(c) {
        return c === '>' || SAX.isWhitespace(c);
    }
    static isMatch(regex, c) {
        return regex.test(c);
    }
    static notMatch(regex, c) {
        return !SAX.isMatch(regex, c);
    }
    static qname(name, attribute) {
        const i = name.indexOf(':');
        const qualName = i < 0 ? ['', name] : name.split(':');
        let prefix = qualName[0];
        let local = qualName[1];
        if (attribute && name === 'xmlns') {
            prefix = 'xmlns';
            local = '';
        }
        return { prefix, local };
    }
    write(chunk) {
        if (this.error) {
            throw this.error;
        }
        if (this.closed) {
            return this.errorFunction('Cannot write after close. Assign an onready handler.');
        }
        if (chunk === null) {
            return this.end();
        }
        if (typeof chunk === 'object') {
            chunk = chunk.toString();
        }
        let i = 0;
        let c;
        while (true) {
            c = SAX.charAt(chunk, i++);
            this.c = c;
            if (!c) {
                break;
            }
            if (this.trackPosition) {
                this.position++;
                if (c === '\n') {
                    this.line++;
                    this.column = 0;
                }
                else {
                    this.column++;
                }
            }
            switch (this.state) {
                case this.S.BEGIN:
                    this.state = this.S.BEGIN_WHITESPACE;
                    if (c === '\uFEFF') {
                        continue;
                    }
                    this.beginWhiteSpace(c);
                    continue;
                case this.S.BEGIN_WHITESPACE:
                    this.beginWhiteSpace(c);
                    continue;
                case this.S.TEXT:
                    if (this.sawRoot && !this.closedRoot) {
                        const starti = i - 1;
                        while (c && c !== '<' && c !== '&') {
                            c = SAX.charAt(chunk, i++);
                            if (c && this.trackPosition) {
                                this.position++;
                                if (c === '\n') {
                                    this.line++;
                                    this.column = 0;
                                }
                                else {
                                    this.column++;
                                }
                            }
                        }
                        this.textNode += chunk.substring(starti, i - 1);
                    }
                    if (c === '<' && !(this.sawRoot && this.closedRoot && !this.strict)) {
                        this.state = this.S.OPEN_WAKA;
                        this.startTagPosition = this.position;
                    }
                    else {
                        if (!SAX.isWhitespace(c) && (!this.sawRoot || this.closedRoot)) {
                            this.strictFail('Text data outside of root node.');
                        }
                        if (c === '&') {
                            this.state = this.S.TEXT_ENTITY;
                        }
                        else {
                            this.textNode += c;
                        }
                    }
                    continue;
                case this.S.SCRIPT:
                    if (c === '<') {
                        this.state = this.S.SCRIPT_ENDING;
                    }
                    else {
                        this.script += c;
                    }
                    continue;
                case this.S.SCRIPT_ENDING:
                    if (c === '/') {
                        this.state = this.S.CLOSE_TAG;
                    }
                    else {
                        this.script += '<' + c;
                        this.state = this.S.SCRIPT;
                    }
                    continue;
                case this.S.OPEN_WAKA:
                    if (c === '!') {
                        this.state = this.S.SGML_DECL;
                        this.sgmlDecl = '';
                    }
                    else if (SAX.isWhitespace(c)) {
                    }
                    else if (SAX.isMatch(nameStart, c)) {
                        this.state = this.S.OPEN_TAG;
                        this.tagName = c;
                    }
                    else if (c === '/') {
                        this.state = this.S.CLOSE_TAG;
                        this.tagName = '';
                    }
                    else if (c === '?') {
                        this.state = this.S.PROC_INST;
                        this.procInstName = this.procInstBody = '';
                    }
                    else {
                        this.strictFail('Unencoded <');
                        if (this.startTagPosition + 1 < this.position) {
                            const pad = this.position - this.startTagPosition;
                            c = new Array(pad).join(' ') + c;
                        }
                        this.textNode += '<' + c;
                        this.state = this.S.TEXT;
                    }
                    continue;
                case this.S.SGML_DECL:
                    if ((this.sgmlDecl + c).toUpperCase() === this.CDATA) {
                        this.emitNode('onopencdata');
                        this.state = this.S.CDATA;
                        this.sgmlDecl = '';
                        this.cdata = '';
                    }
                    else if (this.sgmlDecl + c === '--') {
                        this.state = this.S.COMMENT;
                        this.comment = '';
                        this.sgmlDecl = '';
                    }
                    else if ((this.sgmlDecl + c).toUpperCase() === this.DOCTYPE) {
                        this.state = this.S.DOCTYPE;
                        if (this.doctype || this.sawRoot) {
                            this.strictFail('Inappropriately located doctype declaration');
                        }
                        this.doctype = '';
                        this.sgmlDecl = '';
                    }
                    else if (c === '>') {
                        this.emitNode('onsgmldeclaration', this.sgmlDecl);
                        this.sgmlDecl = '';
                        this.state = this.S.TEXT;
                    }
                    else if (SAX.isQuote(c)) {
                        this.state = this.S.SGML_DECL_QUOTED;
                        this.sgmlDecl += c;
                    }
                    else {
                        this.sgmlDecl += c;
                    }
                    continue;
                case this.S.SGML_DECL_QUOTED:
                    if (c === this.q) {
                        this.state = this.S.SGML_DECL;
                        this.q = '';
                    }
                    this.sgmlDecl += c;
                    continue;
                case this.S.DOCTYPE:
                    if (c === '>') {
                        this.state = this.S.TEXT;
                        this.emitNode('ondoctype', this.doctype);
                        this.doctype = true;
                    }
                    else {
                        this.doctype += c;
                        if (c === '[') {
                            this.state = this.S.DOCTYPE_DTD;
                        }
                        else if (SAX.isQuote(c)) {
                            this.state = this.S.DOCTYPE_QUOTED;
                            this.q = c;
                        }
                    }
                    continue;
                case this.S.DOCTYPE_QUOTED:
                    this.doctype += c;
                    if (c === this.q) {
                        this.q = '';
                        this.state = this.S.DOCTYPE;
                    }
                    continue;
                case this.S.DOCTYPE_DTD:
                    this.doctype += c;
                    if (c === ']') {
                        this.state = this.S.DOCTYPE;
                    }
                    else if (SAX.isQuote(c)) {
                        this.state = this.S.DOCTYPE_DTD_QUOTED;
                        this.q = c;
                    }
                    continue;
                case this.S.DOCTYPE_DTD_QUOTED:
                    this.doctype += c;
                    if (c === this.q) {
                        this.state = this.S.DOCTYPE_DTD;
                        this.q = '';
                    }
                    continue;
                case this.S.COMMENT:
                    if (c === '-') {
                        this.state = this.S.COMMENT_ENDING;
                    }
                    else {
                        this.comment += c;
                    }
                    continue;
                case this.S.COMMENT_ENDING:
                    if (c === '-') {
                        this.state = this.S.COMMENT_ENDED;
                        this.comment = this.textApplyOptions(this.comment);
                        if (this.comment) {
                            this.emitNode('oncomment', this.comment);
                        }
                        this.comment = '';
                    }
                    else {
                        this.comment += '-' + c;
                        this.state = this.S.COMMENT;
                    }
                    continue;
                case this.S.COMMENT_ENDED:
                    if (c !== '>') {
                        this.strictFail('Malformed comment');
                        this.comment += '--' + c;
                        this.state = this.S.COMMENT;
                    }
                    else {
                        this.state = this.S.TEXT;
                    }
                    continue;
                case this.S.CDATA:
                    if (c === ']') {
                        this.state = this.S.CDATA_ENDING;
                    }
                    else {
                        this.cdata += c;
                    }
                    continue;
                case this.S.CDATA_ENDING:
                    if (c === ']') {
                        this.state = this.S.CDATA_ENDING_2;
                    }
                    else {
                        this.cdata += ']' + c;
                        this.state = this.S.CDATA;
                    }
                    continue;
                case this.S.CDATA_ENDING_2:
                    if (c === '>') {
                        if (this.cdata) {
                            this.emitNode('oncdata', this.cdata);
                        }
                        this.emitNode('onclosecdata');
                        this.cdata = '';
                        this.state = this.S.TEXT;
                    }
                    else if (c === ']') {
                        this.cdata += ']';
                    }
                    else {
                        this.cdata += ']]' + c;
                        this.state = this.S.CDATA;
                    }
                    continue;
                case this.S.PROC_INST:
                    if (c === '?') {
                        this.state = this.S.PROC_INST_ENDING;
                    }
                    else if (SAX.isWhitespace(c)) {
                        this.state = this.S.PROC_INST_BODY;
                    }
                    else {
                        this.procInstName += c;
                    }
                    continue;
                case this.S.PROC_INST_BODY:
                    if (!this.procInstBody && SAX.isWhitespace(c)) {
                        continue;
                    }
                    else if (c === '?') {
                        this.state = this.S.PROC_INST_ENDING;
                    }
                    else {
                        this.procInstBody += c;
                    }
                    continue;
                case this.S.PROC_INST_ENDING:
                    if (c === '>') {
                        this.emitNode('onprocessinginstruction', {
                            name: this.procInstName,
                            body: this.procInstBody,
                        });
                        this.procInstName = this.procInstBody = '';
                        this.state = this.S.TEXT;
                    }
                    else {
                        this.procInstBody += '?' + c;
                        this.state = this.S.PROC_INST_BODY;
                    }
                    continue;
                case this.S.OPEN_TAG:
                    if (SAX.isMatch(nameBody, c)) {
                        this.tagName += c;
                    }
                    else {
                        this.newTag();
                        if (c === '>') {
                            this.openTag();
                        }
                        else if (c === '/') {
                            this.state = this.S.OPEN_TAG_SLASH;
                        }
                        else {
                            if (!SAX.isWhitespace(c)) {
                                this.strictFail('Invalid character in tag name');
                            }
                            this.state = this.S.ATTRIB;
                        }
                    }
                    continue;
                case this.S.OPEN_TAG_SLASH:
                    if (c === '>') {
                        this.openTag(true);
                        this.closeTag();
                    }
                    else {
                        this.strictFail('Forward-slash in opening tag not followed by >');
                        this.state = this.S.ATTRIB;
                    }
                    continue;
                case this.S.ATTRIB:
                    if (SAX.isWhitespace(c)) {
                        continue;
                    }
                    else if (c === '>') {
                        this.openTag();
                    }
                    else if (c === '/') {
                        this.state = this.S.OPEN_TAG_SLASH;
                    }
                    else if (SAX.isMatch(nameStart, c)) {
                        this.attribName = c;
                        this.attribValue = '';
                        this.state = this.S.ATTRIB_NAME;
                    }
                    else {
                        this.strictFail('Invalid attribute name');
                    }
                    continue;
                case this.S.ATTRIB_NAME:
                    if (c === '=') {
                        this.state = this.S.ATTRIB_VALUE;
                    }
                    else if (c === '>') {
                        this.strictFail('Attribute without value');
                        this.attribValue = this.attribName;
                        this.attrib();
                        this.openTag();
                    }
                    else if (SAX.isWhitespace(c)) {
                        this.state = this.S.ATTRIB_NAME_SAW_WHITE;
                    }
                    else if (SAX.isMatch(nameBody, c)) {
                        this.attribName += c;
                    }
                    else {
                        this.strictFail('Invalid attribute name');
                    }
                    continue;
                case this.S.ATTRIB_NAME_SAW_WHITE:
                    if (c === '=') {
                        this.state = this.S.ATTRIB_VALUE;
                    }
                    else if (SAX.isWhitespace(c)) {
                        continue;
                    }
                    else {
                        this.strictFail('Attribute without value');
                        this.tag.attributes[this.attribName] = '';
                        this.attribValue = '';
                        this.emitNode('onattribute', {
                            name: this.attribName,
                            value: '',
                        });
                        this.attribName = '';
                        if (c === '>') {
                            this.openTag();
                        }
                        else if (SAX.isMatch(nameStart, c)) {
                            this.attribName = c;
                            this.state = this.S.ATTRIB_NAME;
                        }
                        else {
                            this.strictFail('Invalid attribute name');
                            this.state = this.S.ATTRIB;
                        }
                    }
                    continue;
                case this.S.ATTRIB_VALUE:
                    if (SAX.isWhitespace(c)) {
                        continue;
                    }
                    else if (SAX.isQuote(c)) {
                        this.q = c;
                        this.state = this.S.ATTRIB_VALUE_QUOTED;
                    }
                    else {
                        this.strictFail('Unquoted attribute value');
                        this.state = this.S.ATTRIB_VALUE_UNQUOTED;
                        this.attribValue = c;
                    }
                    continue;
                case this.S.ATTRIB_VALUE_QUOTED:
                    if (c !== this.q) {
                        if (c === '&') {
                            this.state = this.S.ATTRIB_VALUE_ENTITY_Q;
                        }
                        else {
                            this.attribValue += c;
                        }
                        continue;
                    }
                    this.attrib();
                    this.q = '';
                    this.state = this.S.ATTRIB_VALUE_CLOSED;
                    continue;
                case this.S.ATTRIB_VALUE_CLOSED:
                    if (SAX.isWhitespace(c)) {
                        this.state = this.S.ATTRIB;
                    }
                    else if (c === '>') {
                        this.openTag();
                    }
                    else if (c === '/') {
                        this.state = this.S.OPEN_TAG_SLASH;
                    }
                    else if (SAX.isMatch(nameStart, c)) {
                        this.strictFail('No whitespace between attributes');
                        this.attribName = c;
                        this.attribValue = '';
                        this.state = this.S.ATTRIB_NAME;
                    }
                    else {
                        this.strictFail('Invalid attribute name');
                    }
                    continue;
                case this.S.ATTRIB_VALUE_UNQUOTED:
                    if (!SAX.isAttribEnd(c)) {
                        if (c === '&') {
                            this.state = this.S.ATTRIB_VALUE_ENTITY_U;
                        }
                        else {
                            this.attribValue += c;
                        }
                        continue;
                    }
                    this.attrib();
                    if (c === '>') {
                        this.openTag();
                    }
                    else {
                        this.state = this.S.ATTRIB;
                    }
                    continue;
                case this.S.CLOSE_TAG:
                    if (!this.tagName) {
                        if (SAX.isWhitespace(c)) {
                            continue;
                        }
                        else if (SAX.notMatch(nameStart, c)) {
                            if (this.script) {
                                this.script += '</' + c;
                                this.state = this.S.SCRIPT;
                            }
                            else {
                                this.strictFail('Invalid tagname in closing tag.');
                            }
                        }
                        else {
                            this.tagName = c;
                        }
                    }
                    else if (c === '>') {
                        this.closeTag();
                    }
                    else if (SAX.isMatch(nameBody, c)) {
                        this.tagName += c;
                    }
                    else if (this.script) {
                        this.script += '</' + this.tagName;
                        this.tagName = '';
                        this.state = this.S.SCRIPT;
                    }
                    else {
                        if (!SAX.isWhitespace(c)) {
                            this.strictFail('Invalid tagname in closing tag');
                        }
                        this.state = this.S.CLOSE_TAG_SAW_WHITE;
                    }
                    continue;
                case this.S.CLOSE_TAG_SAW_WHITE:
                    if (SAX.isWhitespace(c)) {
                        continue;
                    }
                    if (c === '>') {
                        this.closeTag();
                    }
                    else {
                        this.strictFail('Invalid characters in closing tag');
                    }
                    continue;
                case this.S.TEXT_ENTITY:
                case this.S.ATTRIB_VALUE_ENTITY_Q:
                case this.S.ATTRIB_VALUE_ENTITY_U:
                    let returnState;
                    let buffer;
                    switch (this.state) {
                        case this.S.TEXT_ENTITY:
                            returnState = this.S.TEXT;
                            buffer = 'textNode';
                            break;
                        case this.S.ATTRIB_VALUE_ENTITY_Q:
                            returnState = this.S.ATTRIB_VALUE_QUOTED;
                            buffer = 'attribValue';
                            break;
                        case this.S.ATTRIB_VALUE_ENTITY_U:
                            returnState = this.S.ATTRIB_VALUE_UNQUOTED;
                            buffer = 'attribValue';
                            break;
                        default:
                            throw new Error('Unknown state: ' + this.state);
                    }
                    if (c === ';') {
                        this[buffer] += this.parseEntity();
                        this.entity = '';
                        this.state = returnState;
                    }
                    else if (SAX.isMatch(this.entity.length ? entityBody : entityStart, c)) {
                        this.entity += c;
                    }
                    else {
                        this.strictFail('Invalid character in entity name');
                        this[buffer] += '&' + this.entity + c;
                        this.entity = '';
                        this.state = returnState;
                    }
                    continue;
                default:
                    throw new Error('Unknown state: ' + this.state);
            }
        }
        if (this.position >= this.bufferCheckPosition) {
            this.checkBufferLength();
        }
        return this;
    }
    emit(event, data) {
        if (this.hasOwnProperty(event))
            this[event](data);
    }
    clearBuffers() {
        for (let i = 0, l = this.BUFFERS.length; i < l; i++) {
            this[this[i]] = '';
        }
    }
    flushBuffers() {
        this.closeText();
        if (this.cdata !== '') {
            this.emitNode('oncdata', this.cdata);
            this.cdata = '';
        }
        if (this.script !== '') {
            this.emitNode('onscript', this.script);
            this.script = '';
        }
    }
    end() {
        if (this.sawRoot && !this.closedRoot)
            this.strictFail('Unclosed root tag');
        if (this.state !== this.S.BEGIN &&
            this.state !== this.S.BEGIN_WHITESPACE &&
            this.state !== this.S.TEXT) {
            this.errorFunction('Unexpected end');
        }
        this.closeText();
        this.c = '';
        this.closed = true;
        this.emit('onend');
        return new SAXParser(this.strict, this.opt);
    }
    errorFunction(er) {
        this.closeText();
        if (this.trackPosition) {
            er +=
                '\nLine: ' +
                    this.line +
                    '\nColumn: ' +
                    this.column +
                    '\nChar: ' +
                    this.c;
        }
        const error = new Error(er);
        this.error = error;
        this.emit('onerror', error);
        return this;
    }
    attrib() {
        if (!this.strict) {
            this.attribName = this.attribName[this.looseCase]();
        }
        if (this.attribList.indexOf(this.attribName) !== -1 ||
            this.tag.attributes.hasOwnProperty(this.attribName)) {
            this.attribName = this.attribValue = '';
            return;
        }
        if (this.opt.xmlns) {
            const qn = SAX.qname(this.attribName, true);
            const prefix = qn.prefix;
            const local = qn.local;
            if (prefix === 'xmlns') {
                if (local === 'xml' && this.attribValue !== this.XML_NAMESPACE) {
                    this.strictFail('xml: prefix must be bound to ' +
                        this.XML_NAMESPACE +
                        '\n' +
                        'Actual: ' +
                        this.attribValue);
                }
                else if (local === 'xmlns' &&
                    this.attribValue !== this.XMLNS_NAMESPACE) {
                    this.strictFail('xmlns: prefix must be bound to ' +
                        this.XMLNS_NAMESPACE +
                        '\n' +
                        'Actual: ' +
                        this.attribValue);
                }
                else {
                    const tag = this.tag;
                    const parent = this.tags[this.tags.length - 1] || this;
                    if (tag.ns === parent.ns) {
                        tag.ns = Object.create(parent.ns);
                    }
                    tag.ns[local] = this.attribValue;
                }
            }
            this.attribList.push([this.attribName, this.attribValue]);
        }
        else {
            this.tag.attributes[this.attribName] = this.attribValue;
            this.emitNode('onattribute', {
                name: this.attribName,
                value: this.attribValue,
            });
        }
        this.attribName = this.attribValue = '';
    }
    newTag() {
        if (!this.strict)
            this.tagName = this.tagName[this.looseCase]();
        const parent = this.tags[this.tags.length - 1] || this;
        const tag = (this.tag = { name: this.tagName, attributes: {} });
        if (this.opt.xmlns) {
            tag.ns = parent.ns;
        }
        this.attribList.length = 0;
        this.emitNode('onopentagstart', tag);
    }
    parseEntity() {
        let entity = this.entity;
        const entityLC = entity.toLowerCase();
        let num = NaN;
        let numStr = '';
        if (this.ENTITIES[entity]) {
            return this.ENTITIES[entity];
        }
        if (this.ENTITIES[entityLC]) {
            return this.ENTITIES[entityLC];
        }
        entity = entityLC;
        if (entity.charAt(0) === '#') {
            if (entity.charAt(1) === 'x') {
                entity = entity.slice(2);
                num = parseInt(entity, 16);
                numStr = num.toString(16);
            }
            else {
                entity = entity.slice(1);
                num = parseInt(entity, 10);
                numStr = num.toString(10);
            }
        }
        entity = entity.replace(/^0+/, '');
        if (isNaN(num) || numStr.toLowerCase() !== entity) {
            this.strictFail('Invalid character entity');
            return '&' + this.entity + ';';
        }
        return String.fromCodePoint(num);
    }
    beginWhiteSpace(c) {
        if (c === '<') {
            this.state = this.S.OPEN_WAKA;
            this.startTagPosition = this.position;
        }
        else if (!SAX.isWhitespace(c)) {
            this.strictFail('Non-whitespace before first tag.');
            this.textNode = c;
            this.state = this.S.TEXT;
        }
        else {
        }
    }
    strictFail(message) {
        if (typeof this !== 'object' || !(this instanceof SAXParser)) {
            throw new Error('bad call to strictFail');
        }
        if (this.strict) {
            this.errorFunction(message);
        }
    }
    textApplyOptions(text) {
        if (this.opt.trim)
            text = text.trim();
        if (this.opt.normalize)
            text = text.replace(/\s+/g, ' ');
        return text;
    }
    emitNode(nodeType, data) {
        if (this.textNode)
            this.closeText();
        this.emit(nodeType, data);
    }
    closeText() {
        this.textNode = this.textApplyOptions(this.textNode);
        if (this.textNode !== undefined &&
            this.textNode !== '' &&
            this.textNode !== 'undefined') {
            this.emit('ontext', this.textNode);
        }
        this.textNode = '';
    }
    checkBufferLength() {
        const maxAllowed = Math.max(this.opt.MAX_BUFFER_LENGTH, 10);
        let maxActual = 0;
        for (let i = 0, l = this.BUFFERS.length; i < l; i++) {
            const len = this.hasOwnProperty(this.BUFFERS[i])
                ? this[this.BUFFERS[i]].length
                : 0;
            if (len > maxAllowed) {
                switch (this.BUFFERS[i]) {
                    case 'textNode':
                        this.closeText();
                        break;
                    case 'cdata':
                        this.emitNode('oncdata', this.cdata);
                        this.cdata = '';
                        break;
                    case 'script':
                        this.emitNode('onscript', this.script);
                        this.script = '';
                        break;
                    default:
                        this.errorFunction('Max buffer length exceeded: ' + this.BUFFERS[i]);
                }
            }
            maxActual = Math.max(maxActual, len);
        }
        const m = this.opt.MAX_BUFFER_LENGTH - maxActual;
        this.bufferCheckPosition = m + this.position;
    }
    openTag(selfClosing) {
        if (this.opt.xmlns) {
            const tag = this.tag;
            const qn = SAX.qname(this.tagName);
            tag.prefix = qn.prefix;
            tag.local = qn.local;
            tag.uri = tag.ns[qn.prefix] || '';
            if (tag.prefix && !tag.uri) {
                this.strictFail('Unbound namespace prefix: ' + JSON.stringify(this.tagName));
                tag.uri = qn.prefix;
            }
            const parent = this.tags[this.tags.length - 1] || this;
            if (tag.ns && parent.ns !== tag.ns) {
                const that = this;
                Object.keys(tag.ns).forEach(p => {
                    that.emitNode('onopennamespace', {
                        prefix: p,
                        uri: tag.ns[p],
                    });
                });
            }
            for (let i = 0, l = this.attribList.length; i < l; i++) {
                const nv = this.attribList[i];
                const name = nv[0];
                const value = nv[1];
                const qualName = SAX.qname(name, true);
                const prefix = qualName.prefix;
                const local = qualName.local;
                const uri = prefix === '' ? '' : tag.ns[prefix] || '';
                const a = {
                    name,
                    value,
                    prefix,
                    local,
                    uri,
                };
                if (prefix && prefix !== 'xmlns' && !uri) {
                    this.strictFail('Unbound namespace prefix: ' + JSON.stringify(prefix));
                    a.uri = prefix;
                }
                this.tag.attributes[name] = a;
                this.emitNode('onattribute', a);
            }
            this.attribList.length = 0;
        }
        this.tag.isSelfClosing = !!selfClosing;
        this.sawRoot = true;
        this.tags.push(this.tag);
        this.emitNode('onopentag', this.tag);
        if (!selfClosing) {
            if (!this.noscript && this.tagName.toLowerCase() === 'script') {
                this.state = this.S.SCRIPT;
            }
            else {
                this.state = this.S.TEXT;
            }
            this.tag = null;
            this.tagName = '';
        }
        this.attribName = this.attribValue = '';
        this.attribList.length = 0;
    }
    closeTag() {
        if (!this.tagName) {
            this.strictFail('Weird empty close tag.');
            this.textNode += '</>';
            this.state = this.S.TEXT;
            return;
        }
        if (this.script) {
            if (this.tagName !== 'script') {
                this.script += '</' + this.tagName + '>';
                this.tagName = '';
                this.state = this.S.SCRIPT;
                return;
            }
            this.emitNode('onscript', this.script);
            this.script = '';
        }
        let t = this.tags.length;
        let tagName = this.tagName;
        if (!this.strict) {
            tagName = tagName[this.looseCase]();
        }
        while (t--) {
            const close = this.tags[t];
            if (close.name !== tagName) {
                this.strictFail('Unexpected close tag');
            }
            else {
                break;
            }
        }
        if (t < 0) {
            this.strictFail('Unmatched closing tag: ' + this.tagName);
            this.textNode += '</' + this.tagName + '>';
            this.state = this.S.TEXT;
            return;
        }
        this.tagName = tagName;
        let s = this.tags.length;
        while (s-- > t) {
            const tag = (this.tag = this.tags.pop());
            this.tagName = this.tag.name;
            this.emitNode('onclosetag', this.tagName);
            const x = {};
            for (const i in tag.ns) {
                if (tag.ns.hasOwnProperty(i)) {
                    x[i] = tag.ns[i];
                }
            }
            const parent = this.tags[this.tags.length - 1] || this;
            if (this.opt.xmlns && tag.ns !== parent.ns) {
                const that = this;
                Object.keys(tag.ns).forEach(p => {
                    const n = tag.ns[p];
                    that.emitNode('onclosenamespace', { prefix: p, uri: n });
                });
            }
        }
        if (t === 0)
            this.closedRoot = true;
        this.tagName = this.attribValue = this.attribName = '';
        this.attribList.length = 0;
        this.state = this.S.TEXT;
    }
}
export class SAXParser extends SAX {
    constructor(strict, opt) {
        super();
        if (!(this instanceof SAXParser)) {
            return new SAXParser(strict, opt);
        }
        this.clearBuffers();
        this.q = this.c = '';
        this.opt = { MAX_BUFFER_LENGTH: 64 * 1024, ...opt };
        this.bufferCheckPosition = this.opt.MAX_BUFFER_LENGTH;
        this.opt.lowercase = this.opt.lowercase || this.opt.lowercasetags || false;
        this.looseCase = this.opt.lowercase ? 'toLowerCase' : 'toUpperCase';
        this.tags = [];
        this.closed = this.closedRoot = this.sawRoot = false;
        this.tag = this.error = null;
        this.strict = !!strict;
        this.noscript = !!(strict || this.opt.noscript);
        this.state = this.S.BEGIN;
        this.strictEntities = this.opt.strictEntities;
        this.ENTITIES = this.strictEntities
            ? Object.create(this.XML_ENTITIES)
            : Object.create(this.ENTITIES);
        this.attribList = [];
        if (this.opt.xmlns) {
            this.ns = Object.create(this.rootNS);
        }
        this.trackPosition = this.opt.position !== false;
        if (this.trackPosition) {
            this.position = this.line = this.column = 0;
        }
        this.emit('onready');
    }
    ontext = () => { };
    onprocessinginstruction = () => { };
    onsgmldeclaration = () => { };
    ondoctype = () => { };
    oncomment = () => { };
    onopentagstart = () => { };
    onattribute = () => { };
    onopentag = () => { };
    onclosetag = () => { };
    onopencdata = () => { };
    oncdata = () => { };
    onclosecdata = () => { };
    onerror = () => { };
    onend = () => { };
    onready = () => { };
    onscript = () => { };
    onopennamespace = () => { };
    onclosenamespace = () => { };
    resume() {
        this.error = null;
        return this;
    }
    close() {
        return this.write(null);
    }
    flush() {
        this.flushBuffers();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cHM6Ly9kZW5vLmxhbmQveC9zYXhfdHNAdjEuMi4xMC9zcmMvc2F4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVNBLE1BQU0sU0FBUyxHQUFHLDJKQUEySixDQUFDO0FBQzlLLE1BQU0sUUFBUSxHQUFHLCtMQUErTCxDQUFDO0FBQ2pOLE1BQU0sV0FBVyxHQUFHLDRKQUE0SixDQUFDO0FBQ2pMLE1BQU0sVUFBVSxHQUFHLGdNQUFnTSxDQUFDO0FBQ3BOLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBcUM7SUFDeEQsR0FBRyxFQUFFLEdBQUc7SUFDUixFQUFFLEVBQUUsR0FBRztJQUNQLEVBQUUsRUFBRSxHQUFHO0lBQ1AsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsR0FBRztJQUNULEtBQUssRUFBRSxHQUFHO0lBQ1YsTUFBTSxFQUFFLEdBQUc7SUFDWCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFBRSxHQUFHO0lBQ1QsTUFBTSxFQUFFLEdBQUc7SUFDWCxHQUFHLEVBQUUsR0FBRztJQUNSLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFBRSxHQUFHO0lBQ1QsTUFBTSxFQUFFLEdBQUc7SUFDWCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsSUFBSSxFQUFFLEdBQUc7SUFDVCxNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsTUFBTSxFQUFFLEdBQUc7SUFDWCxJQUFJLEVBQUUsR0FBRztJQUNULEtBQUssRUFBRSxHQUFHO0lBQ1YsTUFBTSxFQUFFLEdBQUc7SUFDWCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsSUFBSSxFQUFFLEdBQUc7SUFDVCxNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFBRSxHQUFHO0lBQ1QsTUFBTSxFQUFFLEdBQUc7SUFDWCxNQUFNLEVBQUUsR0FBRztJQUNYLEtBQUssRUFBRSxHQUFHO0lBQ1YsTUFBTSxFQUFFLEdBQUc7SUFDWCxHQUFHLEVBQUUsR0FBRztJQUNSLElBQUksRUFBRSxHQUFHO0lBQ1QsTUFBTSxFQUFFLEdBQUc7SUFDWCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsSUFBSSxFQUFFLEdBQUc7SUFDVCxNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsTUFBTSxFQUFFLEdBQUc7SUFDWCxJQUFJLEVBQUUsR0FBRztJQUNULEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLEtBQUssRUFBRSxHQUFHO0lBQ1YsTUFBTSxFQUFFLEdBQUc7SUFDWCxJQUFJLEVBQUUsR0FBRztJQUNULE1BQU0sRUFBRSxHQUFHO0lBQ1gsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsR0FBRztJQUNULEdBQUcsRUFBRSxHQUFHO0lBQ1IsSUFBSSxFQUFFLEdBQUc7SUFDVCxLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSxHQUFHO0lBQ1QsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLEdBQUcsRUFBRSxHQUFHO0lBQ1IsTUFBTSxFQUFFLEdBQUc7SUFDWCxJQUFJLEVBQUUsR0FBRztJQUNULEdBQUcsRUFBRSxHQUFHO0lBQ1IsSUFBSSxFQUFFLEdBQUc7SUFDVCxLQUFLLEVBQUUsR0FBRztJQUNWLEdBQUcsRUFBRSxHQUFHO0lBQ1IsR0FBRyxFQUFFLEdBQUc7SUFDUixJQUFJLEVBQUUsR0FBRztJQUNULEdBQUcsRUFBRSxHQUFHO0lBQ1IsTUFBTSxFQUFFLEdBQUc7SUFDWCxJQUFJLEVBQUUsR0FBRztJQUNULElBQUksRUFBRSxHQUFHO0lBQ1QsSUFBSSxFQUFFLEdBQUc7SUFDVCxLQUFLLEVBQUUsR0FBRztJQUNWLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLEdBQUc7SUFDVCxNQUFNLEVBQUUsR0FBRztJQUNYLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLEdBQUc7SUFDVCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsTUFBTSxFQUFFLEdBQUc7SUFDWCxNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLEdBQUc7SUFDVixNQUFNLEVBQUUsR0FBRztJQUNYLE1BQU0sRUFBRSxHQUFHO0lBQ1gsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsR0FBRztJQUNULElBQUksRUFBRSxHQUFHO0lBQ1QsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSxHQUFHO0lBQ1QsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsR0FBRztJQUNWLE9BQU8sRUFBRSxHQUFHO0lBQ1osSUFBSSxFQUFFLEdBQUc7SUFDVCxHQUFHLEVBQUUsR0FBRztJQUNSLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLEdBQUc7SUFDVCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsRUFBRSxFQUFFLEdBQUc7SUFDUCxFQUFFLEVBQUUsR0FBRztJQUNQLEVBQUUsRUFBRSxHQUFHO0lBQ1AsT0FBTyxFQUFFLEdBQUc7SUFDWixFQUFFLEVBQUUsR0FBRztJQUNQLEdBQUcsRUFBRSxHQUFHO0lBQ1IsS0FBSyxFQUFFLEdBQUc7SUFDVixHQUFHLEVBQUUsR0FBRztJQUNSLE9BQU8sRUFBRSxHQUFHO0lBQ1osR0FBRyxFQUFFLEdBQUc7SUFDUixHQUFHLEVBQUUsR0FBRztJQUNSLEdBQUcsRUFBRSxHQUFHO0lBQ1IsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSxHQUFHO0lBQ1QsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsR0FBRztJQUNWLE9BQU8sRUFBRSxHQUFHO0lBQ1osSUFBSSxFQUFFLEdBQUc7SUFDVCxHQUFHLEVBQUUsR0FBRztJQUNSLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLEdBQUc7SUFDVCxLQUFLLEVBQUUsR0FBRztJQUNWLE1BQU0sRUFBRSxHQUFHO0lBQ1gsRUFBRSxFQUFFLEdBQUc7SUFDUCxFQUFFLEVBQUUsR0FBRztJQUNQLEVBQUUsRUFBRSxHQUFHO0lBQ1AsT0FBTyxFQUFFLEdBQUc7SUFDWixFQUFFLEVBQUUsR0FBRztJQUNQLEdBQUcsRUFBRSxHQUFHO0lBQ1IsTUFBTSxFQUFFLEdBQUc7SUFDWCxLQUFLLEVBQUUsR0FBRztJQUNWLEdBQUcsRUFBRSxHQUFHO0lBQ1IsT0FBTyxFQUFFLEdBQUc7SUFDWixHQUFHLEVBQUUsR0FBRztJQUNSLEdBQUcsRUFBRSxHQUFHO0lBQ1IsR0FBRyxFQUFFLEdBQUc7SUFDUixLQUFLLEVBQUUsR0FBRztJQUNWLFFBQVEsRUFBRSxHQUFHO0lBQ2IsS0FBSyxFQUFFLEdBQUc7SUFDVixHQUFHLEVBQUUsR0FBRztJQUNSLElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7SUFDVixNQUFNLEVBQUUsSUFBSTtJQUNaLElBQUksRUFBRSxJQUFJO0lBQ1YsR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsSUFBSTtJQUNULEdBQUcsRUFBRSxJQUFJO0lBQ1QsS0FBSyxFQUFFLElBQUk7SUFDWCxLQUFLLEVBQUUsSUFBSTtJQUNYLEtBQUssRUFBRSxJQUFJO0lBQ1gsS0FBSyxFQUFFLElBQUk7SUFDWCxLQUFLLEVBQUUsSUFBSTtJQUNYLEtBQUssRUFBRSxJQUFJO0lBQ1gsS0FBSyxFQUFFLElBQUk7SUFDWCxLQUFLLEVBQUUsSUFBSTtJQUNYLE1BQU0sRUFBRSxJQUFJO0lBQ1osTUFBTSxFQUFFLElBQUk7SUFDWixJQUFJLEVBQUUsSUFBSTtJQUNWLE1BQU0sRUFBRSxJQUFJO0lBQ1osTUFBTSxFQUFFLElBQUk7SUFDWixLQUFLLEVBQUUsSUFBSTtJQUNYLEtBQUssRUFBRSxJQUFJO0lBQ1gsTUFBTSxFQUFFLElBQUk7SUFDWixNQUFNLEVBQUUsSUFBSTtJQUNaLEtBQUssRUFBRSxJQUFJO0lBQ1gsS0FBSyxFQUFFLElBQUk7SUFDWCxJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxJQUFJO0lBQ1gsTUFBTSxFQUFFLElBQUk7SUFDWixJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxJQUFJO0lBQ1gsT0FBTyxFQUFFLElBQUk7SUFDYixJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBQ1YsS0FBSyxFQUFFLElBQUk7SUFDWCxJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBQ1YsTUFBTSxFQUFFLElBQUk7SUFDWixJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxJQUFJO0lBQ1gsS0FBSyxFQUFFLElBQUk7SUFDWCxLQUFLLEVBQUUsSUFBSTtJQUNYLElBQUksRUFBRSxJQUFJO0lBQ1YsS0FBSyxFQUFFLElBQUk7SUFDWCxFQUFFLEVBQUUsSUFBSTtJQUNSLElBQUksRUFBRSxJQUFJO0lBQ1YsR0FBRyxFQUFFLElBQUk7SUFDVCxLQUFLLEVBQUUsSUFBSTtJQUNYLE1BQU0sRUFBRSxJQUFJO0lBQ1osS0FBSyxFQUFFLElBQUk7SUFDWCxJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxJQUFJO0lBQ1gsR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsSUFBSTtJQUNULEVBQUUsRUFBRSxJQUFJO0lBQ1IsR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsSUFBSTtJQUNULEdBQUcsRUFBRSxJQUFJO0lBQ1QsTUFBTSxFQUFFLElBQUk7SUFDWixHQUFHLEVBQUUsSUFBSTtJQUNULElBQUksRUFBRSxJQUFJO0lBQ1YsS0FBSyxFQUFFLElBQUk7SUFDWCxFQUFFLEVBQUUsSUFBSTtJQUNSLEtBQUssRUFBRSxJQUFJO0lBQ1gsRUFBRSxFQUFFLElBQUk7SUFDUixFQUFFLEVBQUUsSUFBSTtJQUNSLEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLElBQUk7SUFDVCxJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7SUFDVixLQUFLLEVBQUUsSUFBSTtJQUNYLE1BQU0sRUFBRSxJQUFJO0lBQ1osSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxJQUFJO0lBQ1gsS0FBSyxFQUFFLElBQUk7SUFDWCxNQUFNLEVBQUUsSUFBSTtJQUNaLE1BQU0sRUFBRSxJQUFJO0lBQ1osSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUNWLEdBQUcsRUFBRSxJQUFJO0lBQ1QsTUFBTSxFQUFFLElBQUk7SUFDWixLQUFLLEVBQUUsSUFBSTtJQUNYLE1BQU0sRUFBRSxJQUFJO0lBQ1osS0FBSyxFQUFFLElBQUk7Q0FDWixDQUFDO0FBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FB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YSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3JELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDO1FBQzlDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWM7WUFDakMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUNsQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFLckIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtZQUNsQixJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3RDO1FBR0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUM7UUFDakQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUM3QztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUdELE1BQU0sR0FBYSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDNUIsdUJBQXVCLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBQzdDLGlCQUFpQixHQUFhLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUN2QyxTQUFTLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBQy9CLFNBQVMsR0FBYSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDL0IsY0FBYyxHQUFhLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUNwQyxXQUFXLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBQ2pDLFNBQVMsR0FBYSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDL0IsVUFBVSxHQUFhLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUNoQyxXQUFXLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBQ2pDLE9BQU8sR0FBYSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDN0IsWUFBWSxHQUFhLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUNsQyxPQUFPLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBQzdCLEtBQUssR0FBYSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDM0IsT0FBTyxHQUFhLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUM3QixRQUFRLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBQzlCLGVBQWUsR0FBYSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDckMsZ0JBQWdCLEdBQWEsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO0lBRXRDLE1BQU07UUFDSixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLO1FBQ0gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRCxLQUFLO1FBQ0gsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3RCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnN0YW50LWNvbmRpdGlvbiAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXMgKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLWVtcHR5ICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90b3R5cGUtYnVpbHRpbnMgKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNhc2UtZGVjbGFyYXRpb25zICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1taXNsZWFkaW5nLWNoYXJhY3Rlci1jbGFzcyAqL1xuLy8gVE9ETzogcmVtb3ZlIGFsbCBcImFueVwiIHR5cGVzIGFuZCBmaXggZXNsaW50IGlzc3Vlc1xuXG5jb25zdCBuYW1lU3RhcnQgPSAvWzpfQS1aYS16XFx1MDBDMC1cXHUwMEQ2XFx1MDBEOC1cXHUwMEY2XFx1MDBGOC1cXHUwMkZGXFx1MDM3MC1cXHUwMzdEXFx1MDM3Ri1cXHUxRkZGXFx1MjAwQy1cXHUyMDBEXFx1MjA3MC1cXHUyMThGXFx1MkMwMC1cXHUyRkVGXFx1MzAwMS1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkZEXS87XG5jb25zdCBuYW1lQm9keSA9IC9bOl9BLVphLXpcXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjZcXHUwMEY4LVxcdTAyRkZcXHUwMzcwLVxcdTAzN0RcXHUwMzdGLVxcdTFGRkZcXHUyMDBDLVxcdTIwMERcXHUyMDcwLVxcdTIxOEZcXHUyQzAwLVxcdTJGRUZcXHUzMDAxLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRkRcXHUwMEI3XFx1MDMwMC1cXHUwMzZGXFx1MjAzRi1cXHUyMDQwLlxcZC1dLztcbmNvbnN0IGVudGl0eVN0YXJ0ID0gL1sjOl9BLVphLXpcXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjZcXHUwMEY4LVxcdTAyRkZcXHUwMzcwLVxcdTAzN0RcXHUwMzdGLVxcdTFGRkZcXHUyMDBDLVxcdTIwMERcXHUyMDcwLVxcdTIxOEZcXHUyQzAwLVxcdTJGRUZcXHUzMDAxLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRkRdLztcbmNvbnN0IGVudGl0eUJvZHkgPSAvWyM6X0EtWmEtelxcdTAwQzAtXFx1MDBENlxcdTAwRDgtXFx1MDBGNlxcdTAwRjgtXFx1MDJGRlxcdTAzNzAtXFx1MDM3RFxcdTAzN0YtXFx1MUZGRlxcdTIwMEMtXFx1MjAwRFxcdTIwNzAtXFx1MjE4RlxcdTJDMDAtXFx1MkZFRlxcdTMwMDEtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZGRFxcdTAwQjdcXHUwMzAwLVxcdTAzNkZcXHUyMDNGLVxcdTIwNDAuXFxkLV0vO1xuZXhwb3J0IGNvbnN0IEVOVElUSUVTOiB7W2tleTogc3RyaW5nXTogbnVtYmVyIHwgc3RyaW5nfSA9IHtcbiAgYW1wOiAnJicsXG4gIGd0OiAnPicsXG4gIGx0OiAnPCcsXG4gIHF1b3Q6ICdcIicsXG4gIGFwb3M6IFwiJ1wiLFxuICBBRWxpZzogMTk4LFxuICBBYWN1dGU6IDE5MyxcbiAgQWNpcmM6IDE5NCxcbiAgQWdyYXZlOiAxOTIsXG4gIEFyaW5nOiAxOTcsXG4gIEF0aWxkZTogMTk1LFxuICBBdW1sOiAxOTYsXG4gIENjZWRpbDogMTk5LFxuICBFVEg6IDIwOCxcbiAgRWFjdXRlOiAyMDEsXG4gIEVjaXJjOiAyMDIsXG4gIEVncmF2ZTogMjAwLFxuICBFdW1sOiAyMDMsXG4gIElhY3V0ZTogMjA1LFxuICBJY2lyYzogMjA2LFxuICBJZ3JhdmU6IDIwNCxcbiAgSXVtbDogMjA3LFxuICBOdGlsZGU6IDIwOSxcbiAgT2FjdXRlOiAyMTEsXG4gIE9jaXJjOiAyMTIsXG4gIE9ncmF2ZTogMjEwLFxuICBPc2xhc2g6IDIxNixcbiAgT3RpbGRlOiAyMTMsXG4gIE91bWw6IDIxNCxcbiAgVEhPUk46IDIyMixcbiAgVWFjdXRlOiAyMTgsXG4gIFVjaXJjOiAyMTksXG4gIFVncmF2ZTogMjE3LFxuICBVdW1sOiAyMjAsXG4gIFlhY3V0ZTogMjIxLFxuICBhYWN1dGU6IDIyNSxcbiAgYWNpcmM6IDIyNixcbiAgYWVsaWc6IDIzMCxcbiAgYWdyYXZlOiAyMjQsXG4gIGFyaW5nOiAyMjksXG4gIGF0aWxkZTogMjI3LFxuICBhdW1sOiAyMjgsXG4gIGNjZWRpbDogMjMxLFxuICBlYWN1dGU6IDIzMyxcbiAgZWNpcmM6IDIzNCxcbiAgZWdyYXZlOiAyMzIsXG4gIGV0aDogMjQwLFxuICBldW1sOiAyMzUsXG4gIGlhY3V0ZTogMjM3LFxuICBpY2lyYzogMjM4LFxuICBpZ3JhdmU6IDIzNixcbiAgaXVtbDogMjM5LFxuICBudGlsZGU6IDI0MSxcbiAgb2FjdXRlOiAyNDMsXG4gIG9jaXJjOiAyNDQsXG4gIG9ncmF2ZTogMjQyLFxuICBvc2xhc2g6IDI0OCxcbiAgb3RpbGRlOiAyNDUsXG4gIG91bWw6IDI0NixcbiAgc3psaWc6IDIyMyxcbiAgdGhvcm46IDI1NCxcbiAgdWFjdXRlOiAyNTAsXG4gIHVjaXJjOiAyNTEsXG4gIHVncmF2ZTogMjQ5LFxuICB1dW1sOiAyNTIsXG4gIHlhY3V0ZTogMjUzLFxuICB5dW1sOiAyNTUsXG4gIGNvcHk6IDE2OSxcbiAgcmVnOiAxNzQsXG4gIG5ic3A6IDE2MCxcbiAgaWV4Y2w6IDE2MSxcbiAgY2VudDogMTYyLFxuICBwb3VuZDogMTYzLFxuICBjdXJyZW46IDE2NCxcbiAgeWVuOiAxNjUsXG4gIGJydmJhcjogMTY2LFxuICBzZWN0OiAxNjcsXG4gIHVtbDogMTY4LFxuICBvcmRmOiAxNzAsXG4gIGxhcXVvOiAxNzEsXG4gIG5vdDogMTcyLFxuICBzaHk6IDE3MyxcbiAgbWFjcjogMTc1LFxuICBkZWc6IDE3NixcbiAgcGx1c21uOiAxNzcsXG4gIHN1cDE6IDE4NSxcbiAgc3VwMjogMTc4LFxuICBzdXAzOiAxNzksXG4gIGFjdXRlOiAxODAsXG4gIG1pY3JvOiAxODEsXG4gIHBhcmE6IDE4MixcbiAgbWlkZG90OiAxODMsXG4gIGNlZGlsOiAxODQsXG4gIG9yZG06IDE4NixcbiAgcmFxdW86IDE4NyxcbiAgZnJhYzE0OiAxODgsXG4gIGZyYWMxMjogMTg5LFxuICBmcmFjMzQ6IDE5MCxcbiAgaXF1ZXN0OiAxOTEsXG4gIHRpbWVzOiAyMTUsXG4gIGRpdmlkZTogMjQ3LFxuICBPRWxpZzogMzM4LFxuICBvZWxpZzogMzM5LFxuICBTY2Fyb246IDM1MixcbiAgc2Nhcm9uOiAzNTMsXG4gIFl1bWw6IDM3NixcbiAgZm5vZjogNDAyLFxuICBjaXJjOiA3MTAsXG4gIHRpbGRlOiA3MzIsXG4gIEFscGhhOiA5MTMsXG4gIEJldGE6IDkxNCxcbiAgR2FtbWE6IDkxNSxcbiAgRGVsdGE6IDkxNixcbiAgRXBzaWxvbjogOTE3LFxuICBaZXRhOiA5MTgsXG4gIEV0YTogOTE5LFxuICBUaGV0YTogOTIwLFxuICBJb3RhOiA5MjEsXG4gIEthcHBhOiA5MjIsXG4gIExhbWJkYTogOTIzLFxuICBNdTogOTI0LFxuICBOdTogOTI1LFxuICBYaTogOTI2LFxuICBPbWljcm9uOiA5MjcsXG4gIFBpOiA5MjgsXG4gIFJobzogOTI5LFxuICBTaWdtYTogOTMxLFxuICBUYXU6IDkzMixcbiAgVXBzaWxvbjogOTMzLFxuICBQaGk6IDkzNCxcbiAgQ2hpOiA5MzUsXG4gIFBzaTogOTM2LFxuICBPbWVnYTogOTM3LFxuICBhbHBoYTogOTQ1LFxuICBiZXRhOiA5NDYsXG4gIGdhbW1hOiA5NDcsXG4gIGRlbHRhOiA5NDgsXG4gIGVwc2lsb246IDk0OSxcbiAgemV0YTogOTUwLFxuICBldGE6IDk1MSxcbiAgdGhldGE6IDk1MixcbiAgaW90YTogOTUzLFxuICBrYXBwYTogOTU0LFxuICBsYW1iZGE6IDk1NSxcbiAgbXU6IDk1NixcbiAgbnU6IDk1NyxcbiAgeGk6IDk1OCxcbiAgb21pY3JvbjogOTU5LFxuICBwaTogOTYwLFxuICByaG86IDk2MSxcbiAgc2lnbWFmOiA5NjIsXG4gIHNpZ21hOiA5NjMsXG4gIHRhdTogOTY0LFxuICB1cHNpbG9uOiA5NjUsXG4gIHBoaTogOTY2LFxuICBjaGk6IDk2NyxcbiAgcHNpOiA5NjgsXG4gIG9tZWdhOiA5NjksXG4gIHRoZXRhc3ltOiA5NzcsXG4gIHVwc2loOiA5NzgsXG4gIHBpdjogOTgyLFxuICBlbnNwOiA4MTk0LFxuICBlbXNwOiA4MTk1LFxuICB0aGluc3A6IDgyMDEsXG4gIHp3bmo6IDgyMDQsXG4gIHp3ajogODIwNSxcbiAgbHJtOiA4MjA2LFxuICBybG06IDgyMDcsXG4gIG5kYXNoOiA4MjExLFxuICBtZGFzaDogODIxMixcbiAgbHNxdW86IDgyMTYsXG4gIHJzcXVvOiA4MjE3LFxuICBzYnF1bzogODIxOCxcbiAgbGRxdW86IDgyMjAsXG4gIHJkcXVvOiA4MjIxLFxuICBiZHF1bzogODIyMixcbiAgZGFnZ2VyOiA4MjI0LFxuICBEYWdnZXI6IDgyMjUsXG4gIGJ1bGw6IDgyMjYsXG4gIGhlbGxpcDogODIzMCxcbiAgcGVybWlsOiA4MjQwLFxuICBwcmltZTogODI0MixcbiAgUHJpbWU6IDgyNDMsXG4gIGxzYXF1bzogODI0OSxcbiAgcnNhcXVvOiA4MjUwLFxuICBvbGluZTogODI1NCxcbiAgZnJhc2w6IDgyNjAsXG4gIGV1cm86IDgzNjQsXG4gIGltYWdlOiA4NDY1LFxuICB3ZWllcnA6IDg0NzIsXG4gIHJlYWw6IDg0NzYsXG4gIHRyYWRlOiA4NDgyLFxuICBhbGVmc3ltOiA4NTAxLFxuICBsYXJyOiA4NTkyLFxuICB1YXJyOiA4NTkzLFxuICByYXJyOiA4NTk0LFxuICBkYXJyOiA4NTk1LFxuICBoYXJyOiA4NTk2LFxuICBjcmFycjogODYyOSxcbiAgbEFycjogODY1NixcbiAgdUFycjogODY1NyxcbiAgckFycjogODY1OCxcbiAgZEFycjogODY1OSxcbiAgaEFycjogODY2MCxcbiAgZm9yYWxsOiA4NzA0LFxuICBwYXJ0OiA4NzA2LFxuICBleGlzdDogODcwNyxcbiAgZW1wdHk6IDg3MDksXG4gIG5hYmxhOiA4NzExLFxuICBpc2luOiA4NzEyLFxuICBub3RpbjogODcxMyxcbiAgbmk6IDg3MTUsXG4gIHByb2Q6IDg3MTksXG4gIHN1bTogODcyMSxcbiAgbWludXM6IDg3MjIsXG4gIGxvd2FzdDogODcyNyxcbiAgcmFkaWM6IDg3MzAsXG4gIHByb3A6IDg3MzMsXG4gIGluZmluOiA4NzM0LFxuICBhbmc6IDg3MzYsXG4gIGFuZDogODc0MyxcbiAgb3I6IDg3NDQsXG4gIGNhcDogODc0NSxcbiAgY3VwOiA4NzQ2LFxuICBpbnQ6IDg3NDcsXG4gIHRoZXJlNDogODc1NixcbiAgc2ltOiA4NzY0LFxuICBjb25nOiA4NzczLFxuICBhc3ltcDogODc3NixcbiAgbmU6IDg4MDAsXG4gIGVxdWl2OiA4ODAxLFxuICBsZTogODgwNCxcbiAgZ2U6IDg4MDUsXG4gIHN1YjogODgzNCxcbiAgc3VwOiA4ODM1LFxuICBuc3ViOiA4ODM2LFxuICBzdWJlOiA4ODM4LFxuICBzdXBlOiA4ODM5LFxuICBvcGx1czogODg1MyxcbiAgb3RpbWVzOiA4ODU1LFxuICBwZXJwOiA4ODY5LFxuICBzZG90OiA4OTAxLFxuICBsY2VpbDogODk2OCxcbiAgcmNlaWw6IDg5NjksXG4gIGxmbG9vcjogODk3MCxcbiAgcmZsb29yOiA4OTcxLFxuICBsYW5nOiA5MDAxLFxuICByYW5nOiA5MDAyLFxuICBsb3o6IDk2NzQsXG4gIHNwYWRlczogOTgyNCxcbiAgY2x1YnM6IDk4MjcsXG4gIGhlYXJ0czogOTgyOSxcbiAgZGlhbXM6IDk4MzAsXG59O1xuT2JqZWN0LmtleXMoRU5USVRJRVMpLmZvckVhY2goa2V5ID0+IHtcbiAgY29uc3QgZSA9IEVOVElUSUVTW2tleV07XG4gIEVOVElUSUVTW2tleV0gPSB0eXBlb2YgZSA9PT0gJ251bWJlcicgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKGUpIDogZTtcbn0pO1xuXG5pbnRlcmZhY2UgU0FYSW50ZXJmYWNlIHtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufVxuXG5leHBvcnQgY2xhc3MgU0FYIGltcGxlbWVudHMgU0FYSW50ZXJmYWNlIHtcbiAgW2tleTogc3RyaW5nXTogYW55O1xuXG4gIEVWRU5UUzogc3RyaW5nW107XG4gIEVOVElUSUVTOiB7W2tleTogc3RyaW5nXTogbnVtYmVyIHwgc3RyaW5nfSA9IHtcbiAgICAvLyBUT0RPOiBtYWtlIGl0IHJlYWRvbmx5LCBuZWVkZWQgZm9yIGVudGl0eS1tZWdhIHRlc3RcbiAgICAvLyBhbXAsIGd0LCBsdCwgcXVvdCBhbmQgYXBvcyBhcmUgcmVzb2x2ZWQgdG8gc3RyaW5ncyBpbnN0ZWFkIG9mIG51bWVyaWNhbFxuICAgIC8vIGNvZGVzLCBJREsgd2h5XG4gICAgLi4uRU5USVRJRVMsXG4gIH07XG4gIHByb3RlY3RlZCBYTUxfRU5USVRJRVM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAgIGFtcDogJyYnLFxuICAgIGd0OiAnPicsXG4gICAgbHQ6ICc8JyxcbiAgICBxdW90OiAnXCInLFxuICAgIGFwb3M6IFwiJ1wiLFxuICB9O1xuICBwcm90ZWN0ZWQgUzogYW55ID0gMDtcbiAgcHJvdGVjdGVkIG9wdDogYW55O1xuICBwcm90ZWN0ZWQgdHJhY2tQb3NpdGlvbiA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgY29sdW1uID0gMDtcbiAgcHJvdGVjdGVkIGxpbmUgPSAwO1xuICBwcm90ZWN0ZWQgYyA9ICcnO1xuICBwcm90ZWN0ZWQgZXJyb3I6IGFueTtcbiAgcHJvdGVjdGVkIHEgPSAnJztcbiAgcHJvdGVjdGVkIGJ1ZmZlckNoZWNrUG9zaXRpb246IGFueTtcbiAgcHJvdGVjdGVkIGNsb3NlZCA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgdGFnczogYW55W10gPSBbXTtcbiAgcHJvdGVjdGVkIGxvb3NlQ2FzZSA9ICcnO1xuICBwcm90ZWN0ZWQgY2xvc2VkUm9vdCA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgc2F3Um9vdCA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgc3RyaWN0ID0gZmFsc2U7XG4gIHByb3RlY3RlZCB0YWc6IGFueTtcbiAgcHJvdGVjdGVkIHN0cmljdEVudGl0aWVzOiBhbnk7XG4gIHByb3RlY3RlZCBzdGF0ZTogYW55O1xuICBwcm90ZWN0ZWQgbm9zY3JpcHQgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIGF0dHJpYkxpc3Q6IGFueVtdID0gW107XG4gIHByb3RlY3RlZCBuczogYW55O1xuICBwcm90ZWN0ZWQgcG9zaXRpb24gPSAwO1xuICBwcml2YXRlIFNUQVRFOiB7W2luZGV4OiBzdHJpbmddOiBhbnl9ID0ge1xuICAgIEJFR0lOOiB0aGlzLlMrKywgLy8gbGVhZGluZyBieXRlIG9yZGVyIG1hcmsgb3Igd2hpdGVzcGFjZVxuICAgIEJFR0lOX1dISVRFU1BBQ0U6IHRoaXMuUysrLCAvLyBsZWFkaW5nIHdoaXRlc3BhY2VcbiAgICBURVhUOiB0aGlzLlMrKywgLy8gZ2VuZXJhbCBzdHVmZlxuICAgIFRFWFRfRU5USVRZOiB0aGlzLlMrKywgLy8gJmFtcCBhbmQgc3VjaC5cbiAgICBPUEVOX1dBS0E6IHRoaXMuUysrLCAvLyA8XG4gICAgU0dNTF9ERUNMOiB0aGlzLlMrKywgLy8gPCFCTEFSR1xuICAgIFNHTUxfREVDTF9RVU9URUQ6IHRoaXMuUysrLCAvLyA8IUJMQVJHIGZvbyBcImJhclxuICAgIERPQ1RZUEU6IHRoaXMuUysrLCAvLyA8IURPQ1RZUEVcbiAgICBET0NUWVBFX1FVT1RFRDogdGhpcy5TKyssIC8vIDwhRE9DVFlQRSBcIi8vYmxhaFxuICAgIERPQ1RZUEVfRFREOiB0aGlzLlMrKywgLy8gPCFET0NUWVBFIFwiLy9ibGFoXCIgWyAuLi5cbiAgICBET0NUWVBFX0RURF9RVU9URUQ6IHRoaXMuUysrLCAvLyA8IURPQ1RZUEUgXCIvL2JsYWhcIiBbIFwiZm9vXG4gICAgQ09NTUVOVF9TVEFSVElORzogdGhpcy5TKyssIC8vIDwhLVxuICAgIENPTU1FTlQ6IHRoaXMuUysrLCAvLyA8IS0tXG4gICAgQ09NTUVOVF9FTkRJTkc6IHRoaXMuUysrLCAvLyA8IS0tIGJsYWggLVxuICAgIENPTU1FTlRfRU5ERUQ6IHRoaXMuUysrLCAvLyA8IS0tIGJsYWggLS1cbiAgICBDREFUQTogdGhpcy5TKyssIC8vIDwhW0NEQVRBWyBzb21ldGhpbmdcbiAgICBDREFUQV9FTkRJTkc6IHRoaXMuUysrLCAvLyBdXG4gICAgQ0RBVEFfRU5ESU5HXzI6IHRoaXMuUysrLCAvLyBdXVxuICAgIFBST0NfSU5TVDogdGhpcy5TKyssIC8vIDw/aGlcbiAgICBQUk9DX0lOU1RfQk9EWTogdGhpcy5TKyssIC8vIDw/aGkgdGhlcmVcbiAgICBQUk9DX0lOU1RfRU5ESU5HOiB0aGlzLlMrKywgLy8gPD9oaSBcInRoZXJlXCIgP1xuICAgIE9QRU5fVEFHOiB0aGlzLlMrKywgLy8gPHN0cm9uZ1xuICAgIE9QRU5fVEFHX1NMQVNIOiB0aGlzLlMrKywgLy8gPHN0cm9uZyAvXG4gICAgQVRUUklCOiB0aGlzLlMrKywgLy8gPGFcbiAgICBBVFRSSUJfTkFNRTogdGhpcy5TKyssIC8vIDxhIGZvb1xuICAgIEFUVFJJQl9OQU1FX1NBV19XSElURTogdGhpcy5TKyssIC8vIDxhIGZvbyBfXG4gICAgQVRUUklCX1ZBTFVFOiB0aGlzLlMrKywgLy8gPGEgZm9vPVxuICAgIEFUVFJJQl9WQUxVRV9RVU9URUQ6IHRoaXMuUysrLCAvLyA8YSBmb289XCJiYXJcbiAgICBBVFRSSUJfVkFMVUVfQ0xPU0VEOiB0aGlzLlMrKywgLy8gPGEgZm9vPVwiYmFyXCJcbiAgICBBVFRSSUJfVkFMVUVfVU5RVU9URUQ6IHRoaXMuUysrLCAvLyA8YSBmb289YmFyXG4gICAgQVRUUklCX1ZBTFVFX0VOVElUWV9ROiB0aGlzLlMrKywgLy8gPGZvbyBiYXI9XCImcXVvdDtcIlxuICAgIEFUVFJJQl9WQUxVRV9FTlRJVFlfVTogdGhpcy5TKyssIC8vIDxmb28gYmFyPSZxdW90XG4gICAgQ0xPU0VfVEFHOiB0aGlzLlMrKywgLy8gPC9hXG4gICAgQ0xPU0VfVEFHX1NBV19XSElURTogdGhpcy5TKyssIC8vIDwvYSAgID5cbiAgICBTQ1JJUFQ6IHRoaXMuUysrLCAvLyA8c2NyaXB0PiAuLi5cbiAgICBTQ1JJUFRfRU5ESU5HOiB0aGlzLlMrKywgLy8gPHNjcmlwdD4gLi4uIDxcbiAgfTtcbiAgcHJpdmF0ZSByZWFkb25seSBCVUZGRVJTOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBwYXJzZXI6IChzdHJpY3Q6IGJvb2xlYW4sIG9wdDogYW55KSA9PiBTQVhQYXJzZXI7XG4gIHByaXZhdGUgQ0RBVEEgPSAnW0NEQVRBWyc7XG4gIHByaXZhdGUgRE9DVFlQRSA9ICdET0NUWVBFJztcbiAgcHJpdmF0ZSBYTUxfTkFNRVNQQUNFID0gJ2h0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZSc7XG4gIHByaXZhdGUgWE1MTlNfTkFNRVNQQUNFID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvJztcbiAgcHJvdGVjdGVkIHJvb3ROUzoge30gPSB7XG4gICAgeG1sOiB0aGlzLlhNTF9OQU1FU1BBQ0UsXG4gICAgeG1sbnM6IHRoaXMuWE1MTlNfTkFNRVNQQUNFLFxuICB9O1xuICBwcml2YXRlIGNvbW1lbnQ6IGFueTtcbiAgcHJpdmF0ZSBzZ21sRGVjbDogYW55O1xuICBwcml2YXRlIHRleHROb2RlID0gJyc7XG4gIHByaXZhdGUgdGFnTmFtZTogYW55O1xuICBwcml2YXRlIGRvY3R5cGU6IGFueTtcbiAgcHJpdmF0ZSBwcm9jSW5zdE5hbWU6IGFueTtcbiAgcHJpdmF0ZSBwcm9jSW5zdEJvZHk6IGFueTtcbiAgcHJpdmF0ZSBlbnRpdHkgPSAnJztcbiAgcHJpdmF0ZSBhdHRyaWJOYW1lOiBhbnk7XG4gIHByaXZhdGUgYXR0cmliVmFsdWU6IGFueTtcbiAgcHJpdmF0ZSBjZGF0YSA9ICcnO1xuICBwcml2YXRlIHNjcmlwdCA9ICcnO1xuICBwcml2YXRlIHN0YXJ0VGFnUG9zaXRpb24gPSAwO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuQlVGRkVSUyA9IFtcbiAgICAgICdjb21tZW50JyxcbiAgICAgICdzZ21sRGVjbCcsXG4gICAgICAndGV4dE5vZGUnLFxuICAgICAgJ3RhZ05hbWUnLFxuICAgICAgJ2RvY3R5cGUnLFxuICAgICAgJ3Byb2NJbnN0TmFtZScsXG4gICAgICAncHJvY0luc3RCb2R5JyxcbiAgICAgICdlbnRpdHknLFxuICAgICAgJ2F0dHJpYk5hbWUnLFxuICAgICAgJ2F0dHJpYlZhbHVlJyxcbiAgICAgICdjZGF0YScsXG4gICAgICAnc2NyaXB0JyxcbiAgICBdO1xuICAgIHRoaXMuRVZFTlRTID0gW1xuICAgICAgJ3RleHQnLFxuICAgICAgJ3Byb2Nlc3NpbmdpbnN0cnVjdGlvbicsXG4gICAgICAnc2dtbGRlY2xhcmF0aW9uJyxcbiAgICAgICdkb2N0eXBlJyxcbiAgICAgICdjb21tZW50JyxcbiAgICAgICdvcGVudGFnc3RhcnQnLFxuICAgICAgJ2F0dHJpYnV0ZScsXG4gICAgICAnb3BlbnRhZycsXG4gICAgICAnY2xvc2V0YWcnLFxuICAgICAgJ29wZW5jZGF0YScsXG4gICAgICAnY2RhdGEnLFxuICAgICAgJ2Nsb3NlY2RhdGEnLFxuICAgICAgJ2Vycm9yJyxcbiAgICAgICdlbmQnLFxuICAgICAgJ3JlYWR5JyxcbiAgICAgICdzY3JpcHQnLFxuICAgICAgJ29wZW5uYW1lc3BhY2UnLFxuICAgICAgJ2Nsb3NlbmFtZXNwYWNlJyxcbiAgICBdO1xuXG4gICAgdGhpcy5TID0gMDtcblxuICAgIGZvciAoY29uc3QgcyBpbiB0aGlzLlNUQVRFKSB7XG4gICAgICBpZiAodGhpcy5TVEFURS5oYXNPd25Qcm9wZXJ0eShzKSkge1xuICAgICAgICB0aGlzLlNUQVRFW3RoaXMuU1RBVEVbc11dID0gcztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzaG9ydGhhbmRcbiAgICB0aGlzLlMgPSB0aGlzLlNUQVRFO1xuXG4gICAgdGhpcy5wYXJzZXIgPSAoc3RyaWN0LCBvcHQpID0+IG5ldyBTQVhQYXJzZXIoc3RyaWN0LCBvcHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgY2hhckF0KGNodW5rOiBzdHJpbmcsIGk6IG51bWJlcikge1xuICAgIGxldCByZXN1bHQgPSAnJztcbiAgICBpZiAoaSA8IGNodW5rLmxlbmd0aCkge1xuICAgICAgcmVzdWx0ID0gY2h1bmsuY2hhckF0KGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaXNXaGl0ZXNwYWNlKGM6IHN0cmluZykge1xuICAgIHJldHVybiBjID09PSAnICcgfHwgYyA9PT0gJ1xcbicgfHwgYyA9PT0gJ1xccicgfHwgYyA9PT0gJ1xcdCc7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBpc1F1b3RlKGM6IHN0cmluZykge1xuICAgIHJldHVybiBjID09PSAnXCInIHx8IGMgPT09IFwiJ1wiO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaXNBdHRyaWJFbmQoYzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGMgPT09ICc+JyB8fCBTQVguaXNXaGl0ZXNwYWNlKGMpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaXNNYXRjaChyZWdleDogUmVnRXhwLCBjOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcmVnZXgudGVzdChjKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIG5vdE1hdGNoKHJlZ2V4OiBSZWdFeHAsIGM6IHN0cmluZykge1xuICAgIHJldHVybiAhU0FYLmlzTWF0Y2gocmVnZXgsIGMpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgcW5hbWUobmFtZTogc3RyaW5nLCBhdHRyaWJ1dGU/OiBzdHJpbmcgfCBib29sZWFuKSB7XG4gICAgY29uc3QgaSA9IG5hbWUuaW5kZXhPZignOicpO1xuICAgIGNvbnN0IHF1YWxOYW1lID0gaSA8IDAgPyBbJycsIG5hbWVdIDogbmFtZS5zcGxpdCgnOicpO1xuICAgIGxldCBwcmVmaXggPSBxdWFsTmFtZVswXTtcbiAgICBsZXQgbG9jYWwgPSBxdWFsTmFtZVsxXTtcblxuICAgIC8vIDx4IFwieG1sbnNcIj1cImh0dHA6Ly9mb29cIj5cbiAgICBpZiAoYXR0cmlidXRlICYmIG5hbWUgPT09ICd4bWxucycpIHtcbiAgICAgIHByZWZpeCA9ICd4bWxucyc7XG4gICAgICBsb2NhbCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiB7cHJlZml4LCBsb2NhbH07XG4gIH1cblxuICB3cml0ZShjaHVuazogbnVsbCB8IG9iamVjdCB8IHN0cmluZykge1xuICAgIGlmICh0aGlzLmVycm9yKSB7XG4gICAgICB0aHJvdyB0aGlzLmVycm9yO1xuICAgIH1cbiAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmVycm9yRnVuY3Rpb24oXG4gICAgICAgICdDYW5ub3Qgd3JpdGUgYWZ0ZXIgY2xvc2UuIEFzc2lnbiBhbiBvbnJlYWR5IGhhbmRsZXIuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGNodW5rID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmQoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNodW5rID0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgbGV0IGkgPSAwO1xuICAgIGxldCBjOiBzdHJpbmc7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGMgPSBTQVguY2hhckF0KGNodW5rLCBpKyspO1xuICAgICAgdGhpcy5jID0gYztcblxuICAgICAgaWYgKCFjKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy50cmFja1Bvc2l0aW9uKSB7XG4gICAgICAgIHRoaXMucG9zaXRpb24rKztcbiAgICAgICAgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgICAgdGhpcy5saW5lKys7XG4gICAgICAgICAgdGhpcy5jb2x1bW4gPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuY29sdW1uKys7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgIGNhc2UgdGhpcy5TLkJFR0lOOlxuICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQkVHSU5fV0hJVEVTUEFDRTtcbiAgICAgICAgICBpZiAoYyA9PT0gJ1xcdUZFRkYnKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5iZWdpbldoaXRlU3BhY2UoYyk7XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuQkVHSU5fV0hJVEVTUEFDRTpcbiAgICAgICAgICB0aGlzLmJlZ2luV2hpdGVTcGFjZShjKTtcbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5URVhUOlxuICAgICAgICAgIGlmICh0aGlzLnNhd1Jvb3QgJiYgIXRoaXMuY2xvc2VkUm9vdCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRpID0gaSAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoYyAmJiBjICE9PSAnPCcgJiYgYyAhPT0gJyYnKSB7XG4gICAgICAgICAgICAgIGMgPSBTQVguY2hhckF0KGNodW5rLCBpKyspO1xuICAgICAgICAgICAgICBpZiAoYyAmJiB0aGlzLnRyYWNrUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9uKys7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmxpbmUrKztcbiAgICAgICAgICAgICAgICAgIHRoaXMuY29sdW1uID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGhpcy5jb2x1bW4rKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudGV4dE5vZGUgKz0gY2h1bmsuc3Vic3RyaW5nKHN0YXJ0aSwgaSAtIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYyA9PT0gJzwnICYmICEodGhpcy5zYXdSb290ICYmIHRoaXMuY2xvc2VkUm9vdCAmJiAhdGhpcy5zdHJpY3QpKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLk9QRU5fV0FLQTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRUYWdQb3NpdGlvbiA9IHRoaXMucG9zaXRpb247XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghU0FYLmlzV2hpdGVzcGFjZShjKSAmJiAoIXRoaXMuc2F3Um9vdCB8fCB0aGlzLmNsb3NlZFJvb3QpKSB7XG4gICAgICAgICAgICAgIHRoaXMuc3RyaWN0RmFpbCgnVGV4dCBkYXRhIG91dHNpZGUgb2Ygcm9vdCBub2RlLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGMgPT09ICcmJykge1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlRFWFRfRU5USVRZO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy50ZXh0Tm9kZSArPSBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5TQ1JJUFQ6XG4gICAgICAgICAgLy8gb25seSBub24tc3RyaWN0XG4gICAgICAgICAgaWYgKGMgPT09ICc8Jykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TQ1JJUFRfRU5ESU5HO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNjcmlwdCArPSBjO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5TQ1JJUFRfRU5ESU5HOlxuICAgICAgICAgIGlmIChjID09PSAnLycpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQ0xPU0VfVEFHO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNjcmlwdCArPSAnPCcgKyBjO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TQ1JJUFQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLk9QRU5fV0FLQTpcbiAgICAgICAgICAvLyBlaXRoZXIgYSAvLCA/LCAhLCBvciB0ZXh0IGlzIGNvbWluZyBuZXh0LlxuICAgICAgICAgIGlmIChjID09PSAnIScpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuU0dNTF9ERUNMO1xuICAgICAgICAgICAgdGhpcy5zZ21sRGVjbCA9ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoU0FYLmlzV2hpdGVzcGFjZShjKSkge1xuICAgICAgICAgICAgLy8gd2FpdCBmb3IgaXQuLi5cbiAgICAgICAgICB9IGVsc2UgaWYgKFNBWC5pc01hdGNoKG5hbWVTdGFydCwgYykpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuT1BFTl9UQUc7XG4gICAgICAgICAgICB0aGlzLnRhZ05hbWUgPSBjO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJy8nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkNMT1NFX1RBRztcbiAgICAgICAgICAgIHRoaXMudGFnTmFtZSA9ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJz8nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlBST0NfSU5TVDtcbiAgICAgICAgICAgIHRoaXMucHJvY0luc3ROYW1lID0gdGhpcy5wcm9jSW5zdEJvZHkgPSAnJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdVbmVuY29kZWQgPCcpO1xuICAgICAgICAgICAgLy8gaWYgdGhlcmUgd2FzIHNvbWUgd2hpdGVzcGFjZSwgdGhlbiBhZGQgdGhhdCBpbi5cbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXJ0VGFnUG9zaXRpb24gKyAxIDwgdGhpcy5wb3NpdGlvbikge1xuICAgICAgICAgICAgICBjb25zdCBwYWQgPSB0aGlzLnBvc2l0aW9uIC0gdGhpcy5zdGFydFRhZ1Bvc2l0aW9uO1xuICAgICAgICAgICAgICBjID0gbmV3IEFycmF5KHBhZCkuam9pbignICcpICsgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudGV4dE5vZGUgKz0gJzwnICsgYztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuVEVYVDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuU0dNTF9ERUNMOlxuICAgICAgICAgIGlmICgodGhpcy5zZ21sRGVjbCArIGMpLnRvVXBwZXJDYXNlKCkgPT09IHRoaXMuQ0RBVEEpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdE5vZGUoJ29ub3BlbmNkYXRhJyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkNEQVRBO1xuICAgICAgICAgICAgdGhpcy5zZ21sRGVjbCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5jZGF0YSA9ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5zZ21sRGVjbCArIGMgPT09ICctLScpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQ09NTUVOVDtcbiAgICAgICAgICAgIHRoaXMuY29tbWVudCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zZ21sRGVjbCA9ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoKHRoaXMuc2dtbERlY2wgKyBjKS50b1VwcGVyQ2FzZSgpID09PSB0aGlzLkRPQ1RZUEUpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuRE9DVFlQRTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRvY3R5cGUgfHwgdGhpcy5zYXdSb290KSB7XG4gICAgICAgICAgICAgIHRoaXMuc3RyaWN0RmFpbCgnSW5hcHByb3ByaWF0ZWx5IGxvY2F0ZWQgZG9jdHlwZSBkZWNsYXJhdGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kb2N0eXBlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnNnbWxEZWNsID0gJyc7XG4gICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdE5vZGUoJ29uc2dtbGRlY2xhcmF0aW9uJywgdGhpcy5zZ21sRGVjbCk7XG4gICAgICAgICAgICB0aGlzLnNnbWxEZWNsID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlRFWFQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChTQVguaXNRdW90ZShjKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TR01MX0RFQ0xfUVVPVEVEO1xuICAgICAgICAgICAgdGhpcy5zZ21sRGVjbCArPSBjO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNnbWxEZWNsICs9IGM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLlNHTUxfREVDTF9RVU9URUQ6XG4gICAgICAgICAgaWYgKGMgPT09IHRoaXMucSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TR01MX0RFQ0w7XG4gICAgICAgICAgICB0aGlzLnEgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5zZ21sRGVjbCArPSBjO1xuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkRPQ1RZUEU6XG4gICAgICAgICAgaWYgKGMgPT09ICc+Jykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5URVhUO1xuICAgICAgICAgICAgdGhpcy5lbWl0Tm9kZSgnb25kb2N0eXBlJywgdGhpcy5kb2N0eXBlKTtcbiAgICAgICAgICAgIHRoaXMuZG9jdHlwZSA9IHRydWU7IC8vIGp1c3QgcmVtZW1iZXIgdGhhdCB3ZSBzYXcgaXQuXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZG9jdHlwZSArPSBjO1xuICAgICAgICAgICAgaWYgKGMgPT09ICdbJykge1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkRPQ1RZUEVfRFREO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChTQVguaXNRdW90ZShjKSkge1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkRPQ1RZUEVfUVVPVEVEO1xuICAgICAgICAgICAgICB0aGlzLnEgPSBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5ET0NUWVBFX1FVT1RFRDpcbiAgICAgICAgICB0aGlzLmRvY3R5cGUgKz0gYztcbiAgICAgICAgICBpZiAoYyA9PT0gdGhpcy5xKSB7XG4gICAgICAgICAgICB0aGlzLnEgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuRE9DVFlQRTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuRE9DVFlQRV9EVEQ6XG4gICAgICAgICAgdGhpcy5kb2N0eXBlICs9IGM7XG4gICAgICAgICAgaWYgKGMgPT09ICddJykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5ET0NUWVBFO1xuICAgICAgICAgIH0gZWxzZSBpZiAoU0FYLmlzUXVvdGUoYykpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuRE9DVFlQRV9EVERfUVVPVEVEO1xuICAgICAgICAgICAgdGhpcy5xID0gYztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuRE9DVFlQRV9EVERfUVVPVEVEOlxuICAgICAgICAgIHRoaXMuZG9jdHlwZSArPSBjO1xuICAgICAgICAgIGlmIChjID09PSB0aGlzLnEpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuRE9DVFlQRV9EVEQ7XG4gICAgICAgICAgICB0aGlzLnEgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuQ09NTUVOVDpcbiAgICAgICAgICBpZiAoYyA9PT0gJy0nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkNPTU1FTlRfRU5ESU5HO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbW1lbnQgKz0gYztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuQ09NTUVOVF9FTkRJTkc6XG4gICAgICAgICAgaWYgKGMgPT09ICctJykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5DT01NRU5UX0VOREVEO1xuICAgICAgICAgICAgdGhpcy5jb21tZW50ID0gdGhpcy50ZXh0QXBwbHlPcHRpb25zKHRoaXMuY29tbWVudCk7XG4gICAgICAgICAgICBpZiAodGhpcy5jb21tZW50KSB7XG4gICAgICAgICAgICAgIHRoaXMuZW1pdE5vZGUoJ29uY29tbWVudCcsIHRoaXMuY29tbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbW1lbnQgPSAnJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb21tZW50ICs9ICctJyArIGM7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkNPTU1FTlQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkNPTU1FTlRfRU5ERUQ6XG4gICAgICAgICAgaWYgKGMgIT09ICc+Jykge1xuICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdNYWxmb3JtZWQgY29tbWVudCcpO1xuICAgICAgICAgICAgLy8gYWxsb3cgPCEtLSBibGFoIC0tIGJsb28gLS0+IGluIG5vbi1zdHJpY3QgbW9kZSxcbiAgICAgICAgICAgIC8vIHdoaWNoIGlzIGEgY29tbWVudCBvZiBcIiBibGFoIC0tIGJsb28gXCJcbiAgICAgICAgICAgIHRoaXMuY29tbWVudCArPSAnLS0nICsgYztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQ09NTUVOVDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5URVhUO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5DREFUQTpcbiAgICAgICAgICBpZiAoYyA9PT0gJ10nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkNEQVRBX0VORElORztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jZGF0YSArPSBjO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5DREFUQV9FTkRJTkc6XG4gICAgICAgICAgaWYgKGMgPT09ICddJykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5DREFUQV9FTkRJTkdfMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jZGF0YSArPSAnXScgKyBjO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5DREFUQTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuQ0RBVEFfRU5ESU5HXzI6XG4gICAgICAgICAgaWYgKGMgPT09ICc+Jykge1xuICAgICAgICAgICAgaWYgKHRoaXMuY2RhdGEpIHtcbiAgICAgICAgICAgICAgdGhpcy5lbWl0Tm9kZSgnb25jZGF0YScsIHRoaXMuY2RhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbWl0Tm9kZSgnb25jbG9zZWNkYXRhJyk7XG4gICAgICAgICAgICB0aGlzLmNkYXRhID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlRFWFQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXScpIHtcbiAgICAgICAgICAgIHRoaXMuY2RhdGEgKz0gJ10nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNkYXRhICs9ICddXScgKyBjO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5DREFUQTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuUFJPQ19JTlNUOlxuICAgICAgICAgIGlmIChjID09PSAnPycpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuUFJPQ19JTlNUX0VORElORztcbiAgICAgICAgICB9IGVsc2UgaWYgKFNBWC5pc1doaXRlc3BhY2UoYykpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuUFJPQ19JTlNUX0JPRFk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJvY0luc3ROYW1lICs9IGM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLlBST0NfSU5TVF9CT0RZOlxuICAgICAgICAgIGlmICghdGhpcy5wcm9jSW5zdEJvZHkgJiYgU0FYLmlzV2hpdGVzcGFjZShjKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPycpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuUFJPQ19JTlNUX0VORElORztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcm9jSW5zdEJvZHkgKz0gYztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuUFJPQ19JTlNUX0VORElORzpcbiAgICAgICAgICBpZiAoYyA9PT0gJz4nKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXROb2RlKCdvbnByb2Nlc3NpbmdpbnN0cnVjdGlvbicsIHtcbiAgICAgICAgICAgICAgbmFtZTogdGhpcy5wcm9jSW5zdE5hbWUsXG4gICAgICAgICAgICAgIGJvZHk6IHRoaXMucHJvY0luc3RCb2R5LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnByb2NJbnN0TmFtZSA9IHRoaXMucHJvY0luc3RCb2R5ID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlRFWFQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJvY0luc3RCb2R5ICs9ICc/JyArIGM7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlBST0NfSU5TVF9CT0RZO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5PUEVOX1RBRzpcbiAgICAgICAgICBpZiAoU0FYLmlzTWF0Y2gobmFtZUJvZHksIGMpKSB7XG4gICAgICAgICAgICB0aGlzLnRhZ05hbWUgKz0gYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uZXdUYWcoKTtcbiAgICAgICAgICAgIGlmIChjID09PSAnPicpIHtcbiAgICAgICAgICAgICAgdGhpcy5vcGVuVGFnKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICcvJykge1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLk9QRU5fVEFHX1NMQVNIO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKCFTQVguaXNXaGl0ZXNwYWNlKGMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdJbnZhbGlkIGNoYXJhY3RlciBpbiB0YWcgbmFtZScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5PUEVOX1RBR19TTEFTSDpcbiAgICAgICAgICBpZiAoYyA9PT0gJz4nKSB7XG4gICAgICAgICAgICB0aGlzLm9wZW5UYWcodHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlVGFnKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RyaWN0RmFpbCgnRm9yd2FyZC1zbGFzaCBpbiBvcGVuaW5nIHRhZyBub3QgZm9sbG93ZWQgYnkgPicpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5BVFRSSUI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQjpcbiAgICAgICAgICAvLyBoYXZlbid0IHJlYWQgdGhlIGF0dHJpYnV0ZSBuYW1lIHlldC5cbiAgICAgICAgICBpZiAoU0FYLmlzV2hpdGVzcGFjZShjKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicpIHtcbiAgICAgICAgICAgIHRoaXMub3BlblRhZygpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJy8nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLk9QRU5fVEFHX1NMQVNIO1xuICAgICAgICAgIH0gZWxzZSBpZiAoU0FYLmlzTWF0Y2gobmFtZVN0YXJ0LCBjKSkge1xuICAgICAgICAgICAgdGhpcy5hdHRyaWJOYW1lID0gYztcbiAgICAgICAgICAgIHRoaXMuYXR0cmliVmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCX05BTUU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RyaWN0RmFpbCgnSW52YWxpZCBhdHRyaWJ1dGUgbmFtZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5BVFRSSUJfTkFNRTpcbiAgICAgICAgICBpZiAoYyA9PT0gJz0nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkFUVFJJQl9WQUxVRTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc+Jykge1xuICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdBdHRyaWJ1dGUgd2l0aG91dCB2YWx1ZScpO1xuICAgICAgICAgICAgdGhpcy5hdHRyaWJWYWx1ZSA9IHRoaXMuYXR0cmliTmFtZTtcbiAgICAgICAgICAgIHRoaXMuYXR0cmliKCk7XG4gICAgICAgICAgICB0aGlzLm9wZW5UYWcoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFNBWC5pc1doaXRlc3BhY2UoYykpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCX05BTUVfU0FXX1dISVRFO1xuICAgICAgICAgIH0gZWxzZSBpZiAoU0FYLmlzTWF0Y2gobmFtZUJvZHksIGMpKSB7XG4gICAgICAgICAgICB0aGlzLmF0dHJpYk5hbWUgKz0gYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdJbnZhbGlkIGF0dHJpYnV0ZSBuYW1lJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQl9OQU1FX1NBV19XSElURTpcbiAgICAgICAgICBpZiAoYyA9PT0gJz0nKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkFUVFJJQl9WQUxVRTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFNBWC5pc1doaXRlc3BhY2UoYykpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoJ0F0dHJpYnV0ZSB3aXRob3V0IHZhbHVlJyk7XG4gICAgICAgICAgICB0aGlzLnRhZy5hdHRyaWJ1dGVzW3RoaXMuYXR0cmliTmFtZV0gPSAnJztcbiAgICAgICAgICAgIHRoaXMuYXR0cmliVmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuZW1pdE5vZGUoJ29uYXR0cmlidXRlJywge1xuICAgICAgICAgICAgICBuYW1lOiB0aGlzLmF0dHJpYk5hbWUsXG4gICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5hdHRyaWJOYW1lID0gJyc7XG4gICAgICAgICAgICBpZiAoYyA9PT0gJz4nKSB7XG4gICAgICAgICAgICAgIHRoaXMub3BlblRhZygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChTQVguaXNNYXRjaChuYW1lU3RhcnQsIGMpKSB7XG4gICAgICAgICAgICAgIHRoaXMuYXR0cmliTmFtZSA9IGM7XG4gICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCX05BTUU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoJ0ludmFsaWQgYXR0cmlidXRlIG5hbWUnKTtcbiAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5BVFRSSUI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQl9WQUxVRTpcbiAgICAgICAgICBpZiAoU0FYLmlzV2hpdGVzcGFjZShjKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChTQVguaXNRdW90ZShjKSkge1xuICAgICAgICAgICAgdGhpcy5xID0gYztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCX1ZBTFVFX1FVT1RFRDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdVbnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUnKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCX1ZBTFVFX1VOUVVPVEVEO1xuICAgICAgICAgICAgdGhpcy5hdHRyaWJWYWx1ZSA9IGM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQl9WQUxVRV9RVU9URUQ6XG4gICAgICAgICAgaWYgKGMgIT09IHRoaXMucSkge1xuICAgICAgICAgICAgaWYgKGMgPT09ICcmJykge1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkFUVFJJQl9WQUxVRV9FTlRJVFlfUTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuYXR0cmliVmFsdWUgKz0gYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmF0dHJpYigpO1xuICAgICAgICAgIHRoaXMucSA9ICcnO1xuICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQVRUUklCX1ZBTFVFX0NMT1NFRDtcbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5BVFRSSUJfVkFMVUVfQ0xPU0VEOlxuICAgICAgICAgIGlmIChTQVguaXNXaGl0ZXNwYWNlKGMpKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkFUVFJJQjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc+Jykge1xuICAgICAgICAgICAgdGhpcy5vcGVuVGFnKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnLycpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuT1BFTl9UQUdfU0xBU0g7XG4gICAgICAgICAgfSBlbHNlIGlmIChTQVguaXNNYXRjaChuYW1lU3RhcnQsIGMpKSB7XG4gICAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoJ05vIHdoaXRlc3BhY2UgYmV0d2VlbiBhdHRyaWJ1dGVzJyk7XG4gICAgICAgICAgICB0aGlzLmF0dHJpYk5hbWUgPSBjO1xuICAgICAgICAgICAgdGhpcy5hdHRyaWJWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5BVFRSSUJfTkFNRTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdJbnZhbGlkIGF0dHJpYnV0ZSBuYW1lJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQl9WQUxVRV9VTlFVT1RFRDpcbiAgICAgICAgICBpZiAoIVNBWC5pc0F0dHJpYkVuZChjKSkge1xuICAgICAgICAgICAgaWYgKGMgPT09ICcmJykge1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkFUVFJJQl9WQUxVRV9FTlRJVFlfVTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuYXR0cmliVmFsdWUgKz0gYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmF0dHJpYigpO1xuICAgICAgICAgIGlmIChjID09PSAnPicpIHtcbiAgICAgICAgICAgIHRoaXMub3BlblRhZygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLkFUVFJJQjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgY2FzZSB0aGlzLlMuQ0xPU0VfVEFHOlxuICAgICAgICAgIGlmICghdGhpcy50YWdOYW1lKSB7XG4gICAgICAgICAgICBpZiAoU0FYLmlzV2hpdGVzcGFjZShjKSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoU0FYLm5vdE1hdGNoKG5hbWVTdGFydCwgYykpIHtcbiAgICAgICAgICAgICAgaWYgKHRoaXMuc2NyaXB0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JpcHQgKz0gJzwvJyArIGM7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TQ1JJUFQ7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdJbnZhbGlkIHRhZ25hbWUgaW4gY2xvc2luZyB0YWcuJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMudGFnTmFtZSA9IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicpIHtcbiAgICAgICAgICAgIHRoaXMuY2xvc2VUYWcoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFNBWC5pc01hdGNoKG5hbWVCb2R5LCBjKSkge1xuICAgICAgICAgICAgdGhpcy50YWdOYW1lICs9IGM7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnNjcmlwdCkge1xuICAgICAgICAgICAgdGhpcy5zY3JpcHQgKz0gJzwvJyArIHRoaXMudGFnTmFtZTtcbiAgICAgICAgICAgIHRoaXMudGFnTmFtZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TQ1JJUFQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghU0FYLmlzV2hpdGVzcGFjZShjKSkge1xuICAgICAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoJ0ludmFsaWQgdGFnbmFtZSBpbiBjbG9zaW5nIHRhZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5DTE9TRV9UQUdfU0FXX1dISVRFO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5DTE9TRV9UQUdfU0FXX1dISVRFOlxuICAgICAgICAgIGlmIChTQVguaXNXaGl0ZXNwYWNlKGMpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGMgPT09ICc+Jykge1xuICAgICAgICAgICAgdGhpcy5jbG9zZVRhZygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoJ0ludmFsaWQgY2hhcmFjdGVycyBpbiBjbG9zaW5nIHRhZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICBjYXNlIHRoaXMuUy5URVhUX0VOVElUWTpcbiAgICAgICAgY2FzZSB0aGlzLlMuQVRUUklCX1ZBTFVFX0VOVElUWV9ROlxuICAgICAgICBjYXNlIHRoaXMuUy5BVFRSSUJfVkFMVUVfRU5USVRZX1U6XG4gICAgICAgICAgbGV0IHJldHVyblN0YXRlO1xuICAgICAgICAgIGxldCBidWZmZXI7XG4gICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIHRoaXMuUy5URVhUX0VOVElUWTpcbiAgICAgICAgICAgICAgcmV0dXJuU3RhdGUgPSB0aGlzLlMuVEVYVDtcbiAgICAgICAgICAgICAgYnVmZmVyID0gJ3RleHROb2RlJztcbiAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQl9WQUxVRV9FTlRJVFlfUTpcbiAgICAgICAgICAgICAgcmV0dXJuU3RhdGUgPSB0aGlzLlMuQVRUUklCX1ZBTFVFX1FVT1RFRDtcbiAgICAgICAgICAgICAgYnVmZmVyID0gJ2F0dHJpYlZhbHVlJztcbiAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgdGhpcy5TLkFUVFJJQl9WQUxVRV9FTlRJVFlfVTpcbiAgICAgICAgICAgICAgcmV0dXJuU3RhdGUgPSB0aGlzLlMuQVRUUklCX1ZBTFVFX1VOUVVPVEVEO1xuICAgICAgICAgICAgICBidWZmZXIgPSAnYXR0cmliVmFsdWUnO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHN0YXRlOiAnICsgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGMgPT09ICc7Jykge1xuICAgICAgICAgICAgdGhpc1tidWZmZXJdICs9IHRoaXMucGFyc2VFbnRpdHkoKTtcbiAgICAgICAgICAgIHRoaXMuZW50aXR5ID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gcmV0dXJuU3RhdGU7XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIFNBWC5pc01hdGNoKHRoaXMuZW50aXR5Lmxlbmd0aCA/IGVudGl0eUJvZHkgOiBlbnRpdHlTdGFydCwgYylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRoaXMuZW50aXR5ICs9IGM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RyaWN0RmFpbCgnSW52YWxpZCBjaGFyYWN0ZXIgaW4gZW50aXR5IG5hbWUnKTtcbiAgICAgICAgICAgIHRoaXNbYnVmZmVyXSArPSAnJicgKyB0aGlzLmVudGl0eSArIGM7XG4gICAgICAgICAgICB0aGlzLmVudGl0eSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHJldHVyblN0YXRlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHN0YXRlOiAnICsgdGhpcy5zdGF0ZSk7XG4gICAgICB9XG4gICAgfSAvLyB3aGlsZVxuXG4gICAgaWYgKHRoaXMucG9zaXRpb24gPj0gdGhpcy5idWZmZXJDaGVja1Bvc2l0aW9uKSB7XG4gICAgICB0aGlzLmNoZWNrQnVmZmVyTGVuZ3RoKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGVtaXQoZXZlbnQ6IHN0cmluZywgZGF0YT86IEVycm9yIHwge30pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShldmVudCkpIHRoaXNbZXZlbnRdKGRhdGEpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNsZWFyQnVmZmVycygpIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHRoaXMuQlVGRkVSUy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXNbdGhpc1tpXV0gPSAnJztcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZmx1c2hCdWZmZXJzKCkge1xuICAgIHRoaXMuY2xvc2VUZXh0KCk7XG4gICAgaWYgKHRoaXMuY2RhdGEgIT09ICcnKSB7XG4gICAgICB0aGlzLmVtaXROb2RlKCdvbmNkYXRhJywgdGhpcy5jZGF0YSk7XG4gICAgICB0aGlzLmNkYXRhID0gJyc7XG4gICAgfVxuICAgIGlmICh0aGlzLnNjcmlwdCAhPT0gJycpIHtcbiAgICAgIHRoaXMuZW1pdE5vZGUoJ29uc2NyaXB0JywgdGhpcy5zY3JpcHQpO1xuICAgICAgdGhpcy5zY3JpcHQgPSAnJztcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZW5kKCkge1xuICAgIGlmICh0aGlzLnNhd1Jvb3QgJiYgIXRoaXMuY2xvc2VkUm9vdCkgdGhpcy5zdHJpY3RGYWlsKCdVbmNsb3NlZCByb290IHRhZycpO1xuICAgIGlmIChcbiAgICAgIHRoaXMuc3RhdGUgIT09IHRoaXMuUy5CRUdJTiAmJlxuICAgICAgdGhpcy5zdGF0ZSAhPT0gdGhpcy5TLkJFR0lOX1dISVRFU1BBQ0UgJiZcbiAgICAgIHRoaXMuc3RhdGUgIT09IHRoaXMuUy5URVhUXG4gICAgKSB7XG4gICAgICB0aGlzLmVycm9yRnVuY3Rpb24oJ1VuZXhwZWN0ZWQgZW5kJyk7XG4gICAgfVxuICAgIHRoaXMuY2xvc2VUZXh0KCk7XG4gICAgdGhpcy5jID0gJyc7XG4gICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZW1pdCgnb25lbmQnKTtcbiAgICByZXR1cm4gbmV3IFNBWFBhcnNlcih0aGlzLnN0cmljdCwgdGhpcy5vcHQpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGVycm9yRnVuY3Rpb24oZXI6IHN0cmluZykge1xuICAgIHRoaXMuY2xvc2VUZXh0KCk7XG4gICAgaWYgKHRoaXMudHJhY2tQb3NpdGlvbikge1xuICAgICAgZXIgKz1cbiAgICAgICAgJ1xcbkxpbmU6ICcgK1xuICAgICAgICB0aGlzLmxpbmUgK1xuICAgICAgICAnXFxuQ29sdW1uOiAnICtcbiAgICAgICAgdGhpcy5jb2x1bW4gK1xuICAgICAgICAnXFxuQ2hhcjogJyArXG4gICAgICAgIHRoaXMuYztcbiAgICB9XG4gICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoZXIpO1xuICAgIHRoaXMuZXJyb3IgPSBlcnJvcjtcbiAgICB0aGlzLmVtaXQoJ29uZXJyb3InLCBlcnJvcik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwcml2YXRlIGF0dHJpYigpIHtcbiAgICBpZiAoIXRoaXMuc3RyaWN0KSB7XG4gICAgICB0aGlzLmF0dHJpYk5hbWUgPSB0aGlzLmF0dHJpYk5hbWVbdGhpcy5sb29zZUNhc2VdKCk7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgdGhpcy5hdHRyaWJMaXN0LmluZGV4T2YodGhpcy5hdHRyaWJOYW1lKSAhPT0gLTEgfHxcbiAgICAgIHRoaXMudGFnLmF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkodGhpcy5hdHRyaWJOYW1lKVxuICAgICkge1xuICAgICAgdGhpcy5hdHRyaWJOYW1lID0gdGhpcy5hdHRyaWJWYWx1ZSA9ICcnO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdC54bWxucykge1xuICAgICAgY29uc3QgcW4gPSBTQVgucW5hbWUodGhpcy5hdHRyaWJOYW1lLCB0cnVlKTtcbiAgICAgIGNvbnN0IHByZWZpeCA9IHFuLnByZWZpeDtcbiAgICAgIGNvbnN0IGxvY2FsID0gcW4ubG9jYWw7XG5cbiAgICAgIGlmIChwcmVmaXggPT09ICd4bWxucycpIHtcbiAgICAgICAgLy8gbmFtZXNwYWNlIGJpbmRpbmcgYXR0cmlidXRlLiBwdXNoIHRoZSBiaW5kaW5nIGludG8gc2NvcGVcbiAgICAgICAgaWYgKGxvY2FsID09PSAneG1sJyAmJiB0aGlzLmF0dHJpYlZhbHVlICE9PSB0aGlzLlhNTF9OQU1FU1BBQ0UpIHtcbiAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoXG4gICAgICAgICAgICAneG1sOiBwcmVmaXggbXVzdCBiZSBib3VuZCB0byAnICtcbiAgICAgICAgICAgICAgdGhpcy5YTUxfTkFNRVNQQUNFICtcbiAgICAgICAgICAgICAgJ1xcbicgK1xuICAgICAgICAgICAgICAnQWN0dWFsOiAnICtcbiAgICAgICAgICAgICAgdGhpcy5hdHRyaWJWYWx1ZVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgbG9jYWwgPT09ICd4bWxucycgJiZcbiAgICAgICAgICB0aGlzLmF0dHJpYlZhbHVlICE9PSB0aGlzLlhNTE5TX05BTUVTUEFDRVxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoXG4gICAgICAgICAgICAneG1sbnM6IHByZWZpeCBtdXN0IGJlIGJvdW5kIHRvICcgK1xuICAgICAgICAgICAgICB0aGlzLlhNTE5TX05BTUVTUEFDRSArXG4gICAgICAgICAgICAgICdcXG4nICtcbiAgICAgICAgICAgICAgJ0FjdHVhbDogJyArXG4gICAgICAgICAgICAgIHRoaXMuYXR0cmliVmFsdWVcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHRhZyA9IHRoaXMudGFnO1xuICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMudGFnc1t0aGlzLnRhZ3MubGVuZ3RoIC0gMV0gfHwgdGhpcztcbiAgICAgICAgICBpZiAodGFnLm5zID09PSBwYXJlbnQubnMpIHtcbiAgICAgICAgICAgIHRhZy5ucyA9IE9iamVjdC5jcmVhdGUocGFyZW50Lm5zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLm5zW2xvY2FsXSA9IHRoaXMuYXR0cmliVmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZGVmZXIgb25hdHRyaWJ1dGUgZXZlbnRzIHVudGlsIGFsbCBhdHRyaWJ1dGVzIGhhdmUgYmVlbiBzZWVuXG4gICAgICAvLyBzbyBhbnkgbmV3IGJpbmRpbmdzIGNhbiB0YWtlIGVmZmVjdC4gcHJlc2VydmUgYXR0cmlidXRlIG9yZGVyXG4gICAgICAvLyBzbyBkZWZlcnJlZCBldmVudHMgY2FuIGJlIGVtaXR0ZWQgaW4gZG9jdW1lbnQgb3JkZXJcbiAgICAgIHRoaXMuYXR0cmliTGlzdC5wdXNoKFt0aGlzLmF0dHJpYk5hbWUsIHRoaXMuYXR0cmliVmFsdWVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaW4gbm9uLXhtbG5zIG1vZGUsIHdlIGNhbiBlbWl0IHRoZSBldmVudCByaWdodCBhd2F5XG4gICAgICB0aGlzLnRhZy5hdHRyaWJ1dGVzW3RoaXMuYXR0cmliTmFtZV0gPSB0aGlzLmF0dHJpYlZhbHVlO1xuICAgICAgdGhpcy5lbWl0Tm9kZSgnb25hdHRyaWJ1dGUnLCB7XG4gICAgICAgIG5hbWU6IHRoaXMuYXR0cmliTmFtZSxcbiAgICAgICAgdmFsdWU6IHRoaXMuYXR0cmliVmFsdWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmF0dHJpYk5hbWUgPSB0aGlzLmF0dHJpYlZhbHVlID0gJyc7XG4gIH1cblxuICBwcml2YXRlIG5ld1RhZygpIHtcbiAgICBpZiAoIXRoaXMuc3RyaWN0KSB0aGlzLnRhZ05hbWUgPSB0aGlzLnRhZ05hbWVbdGhpcy5sb29zZUNhc2VdKCk7XG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy50YWdzW3RoaXMudGFncy5sZW5ndGggLSAxXSB8fCB0aGlzO1xuICAgIGNvbnN0IHRhZzogYW55ID0gKHRoaXMudGFnID0ge25hbWU6IHRoaXMudGFnTmFtZSwgYXR0cmlidXRlczoge319KTtcblxuICAgIC8vIHdpbGwgYmUgb3ZlcnJpZGRlbiBpZiB0YWcgY29udGFpbnMgYW4geG1sbnM9XCJmb29cIiBvciB4bWxuczpmb289XCJiYXJcIlxuICAgIGlmICh0aGlzLm9wdC54bWxucykge1xuICAgICAgdGFnLm5zID0gcGFyZW50Lm5zO1xuICAgIH1cbiAgICB0aGlzLmF0dHJpYkxpc3QubGVuZ3RoID0gMDtcbiAgICB0aGlzLmVtaXROb2RlKCdvbm9wZW50YWdzdGFydCcsIHRhZyk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlRW50aXR5KCkge1xuICAgIGxldCBlbnRpdHkgPSB0aGlzLmVudGl0eTtcbiAgICBjb25zdCBlbnRpdHlMQyA9IGVudGl0eS50b0xvd2VyQ2FzZSgpO1xuICAgIGxldCBudW0gPSBOYU47XG4gICAgbGV0IG51bVN0ciA9ICcnO1xuXG4gICAgaWYgKHRoaXMuRU5USVRJRVNbZW50aXR5XSkge1xuICAgICAgcmV0dXJuIHRoaXMuRU5USVRJRVNbZW50aXR5XTtcbiAgICB9XG4gICAgaWYgKHRoaXMuRU5USVRJRVNbZW50aXR5TENdKSB7XG4gICAgICByZXR1cm4gdGhpcy5FTlRJVElFU1tlbnRpdHlMQ107XG4gICAgfVxuICAgIGVudGl0eSA9IGVudGl0eUxDO1xuICAgIGlmIChlbnRpdHkuY2hhckF0KDApID09PSAnIycpIHtcbiAgICAgIGlmIChlbnRpdHkuY2hhckF0KDEpID09PSAneCcpIHtcbiAgICAgICAgZW50aXR5ID0gZW50aXR5LnNsaWNlKDIpO1xuICAgICAgICAvLyBUT0RPOiByZW1vdmUgdHNsaW50OmRpc2FibGVcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4gICAgICAgIG51bSA9IHBhcnNlSW50KGVudGl0eSwgMTYpO1xuICAgICAgICBudW1TdHIgPSBudW0udG9TdHJpbmcoMTYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50aXR5ID0gZW50aXR5LnNsaWNlKDEpO1xuICAgICAgICAvLyBUT0RPOiByZW1vdmUgdHNsaW50OmRpc2FibGVcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4gICAgICAgIG51bSA9IHBhcnNlSW50KGVudGl0eSwgMTApO1xuICAgICAgICBudW1TdHIgPSBudW0udG9TdHJpbmcoMTApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGVudGl0eSA9IGVudGl0eS5yZXBsYWNlKC9eMCsvLCAnJyk7XG4gICAgaWYgKGlzTmFOKG51bSkgfHwgbnVtU3RyLnRvTG93ZXJDYXNlKCkgIT09IGVudGl0eSkge1xuICAgICAgdGhpcy5zdHJpY3RGYWlsKCdJbnZhbGlkIGNoYXJhY3RlciBlbnRpdHknKTtcbiAgICAgIHJldHVybiAnJicgKyB0aGlzLmVudGl0eSArICc7JztcbiAgICB9XG5cbiAgICByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQobnVtKTtcbiAgfVxuXG4gIHByaXZhdGUgYmVnaW5XaGl0ZVNwYWNlKGM6IHN0cmluZykge1xuICAgIGlmIChjID09PSAnPCcpIHtcbiAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuT1BFTl9XQUtBO1xuICAgICAgdGhpcy5zdGFydFRhZ1Bvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcbiAgICB9IGVsc2UgaWYgKCFTQVguaXNXaGl0ZXNwYWNlKGMpKSB7XG4gICAgICAvLyBoYXZlIHRvIHByb2Nlc3MgdGhpcyBhcyBhIHRleHQgbm9kZS5cbiAgICAgIC8vIHdlaXJkLCBidXQgaGFwcGVucy5cbiAgICAgIHRoaXMuc3RyaWN0RmFpbCgnTm9uLXdoaXRlc3BhY2UgYmVmb3JlIGZpcnN0IHRhZy4nKTtcbiAgICAgIHRoaXMudGV4dE5vZGUgPSBjO1xuICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5URVhUO1xuICAgIH0gZWxzZSB7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdHJpY3RGYWlsKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ29iamVjdCcgfHwgISh0aGlzIGluc3RhbmNlb2YgU0FYUGFyc2VyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgY2FsbCB0byBzdHJpY3RGYWlsJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmljdCkge1xuICAgICAgdGhpcy5lcnJvckZ1bmN0aW9uKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdGV4dEFwcGx5T3B0aW9ucyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLm9wdC50cmltKSB0ZXh0ID0gdGV4dC50cmltKCk7XG4gICAgaWYgKHRoaXMub3B0Lm5vcm1hbGl6ZSkgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0Tm9kZShub2RlVHlwZTogc3RyaW5nLCBkYXRhPzoge30pIHtcbiAgICBpZiAodGhpcy50ZXh0Tm9kZSkgdGhpcy5jbG9zZVRleHQoKTtcbiAgICB0aGlzLmVtaXQobm9kZVR5cGUsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBjbG9zZVRleHQoKSB7XG4gICAgdGhpcy50ZXh0Tm9kZSA9IHRoaXMudGV4dEFwcGx5T3B0aW9ucyh0aGlzLnRleHROb2RlKTtcbiAgICAvLyBUT0RPOiBmaWd1cmUgb3V0IHdoeSB0aGlzLnRleHROb2RlIGNhbiBiZSBcIlwiIGFuZCBcInVuZGVmaW5lZFwiXG4gICAgaWYgKFxuICAgICAgdGhpcy50ZXh0Tm9kZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB0aGlzLnRleHROb2RlICE9PSAnJyAmJlxuICAgICAgdGhpcy50ZXh0Tm9kZSAhPT0gJ3VuZGVmaW5lZCdcbiAgICApIHtcbiAgICAgIHRoaXMuZW1pdCgnb250ZXh0JywgdGhpcy50ZXh0Tm9kZSk7XG4gICAgfVxuICAgIHRoaXMudGV4dE5vZGUgPSAnJztcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tCdWZmZXJMZW5ndGgoKSB7XG4gICAgY29uc3QgbWF4QWxsb3dlZCA9IE1hdGgubWF4KHRoaXMub3B0Lk1BWF9CVUZGRVJfTEVOR1RILCAxMCk7XG4gICAgbGV0IG1heEFjdHVhbCA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSB0aGlzLkJVRkZFUlMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBjb25zdCBsZW4gPSB0aGlzLmhhc093blByb3BlcnR5KHRoaXMuQlVGRkVSU1tpXSlcbiAgICAgICAgPyB0aGlzW3RoaXMuQlVGRkVSU1tpXV0ubGVuZ3RoXG4gICAgICAgIDogMDtcbiAgICAgIGlmIChsZW4gPiBtYXhBbGxvd2VkKSB7XG4gICAgICAgIC8vIFRleHQvY2RhdGEgbm9kZXMgY2FuIGdldCBiaWcsIGFuZCBzaW5jZSB0aGV5J3JlIGJ1ZmZlcmVkLFxuICAgICAgICAvLyB3ZSBjYW4gZ2V0IGhlcmUgdW5kZXIgbm9ybWFsIGNvbmRpdGlvbnMuXG4gICAgICAgIC8vIEF2b2lkIGlzc3VlcyBieSBlbWl0dGluZyB0aGUgdGV4dCBub2RlIG5vdyxcbiAgICAgICAgLy8gc28gYXQgbGVhc3QgaXQgd29uJ3QgZ2V0IGFueSBiaWdnZXIuXG4gICAgICAgIHN3aXRjaCAodGhpcy5CVUZGRVJTW2ldKSB7XG4gICAgICAgICAgY2FzZSAndGV4dE5vZGUnOlxuICAgICAgICAgICAgdGhpcy5jbG9zZVRleHQoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2NkYXRhJzpcbiAgICAgICAgICAgIHRoaXMuZW1pdE5vZGUoJ29uY2RhdGEnLCB0aGlzLmNkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuY2RhdGEgPSAnJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICB0aGlzLmVtaXROb2RlKCdvbnNjcmlwdCcsIHRoaXMuc2NyaXB0KTtcbiAgICAgICAgICAgIHRoaXMuc2NyaXB0ID0gJyc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhpcy5lcnJvckZ1bmN0aW9uKFxuICAgICAgICAgICAgICAnTWF4IGJ1ZmZlciBsZW5ndGggZXhjZWVkZWQ6ICcgKyB0aGlzLkJVRkZFUlNbaV1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG1heEFjdHVhbCA9IE1hdGgubWF4KG1heEFjdHVhbCwgbGVuKTtcbiAgICB9XG4gICAgLy8gc2NoZWR1bGUgdGhlIG5leHQgY2hlY2sgZm9yIHRoZSBlYXJsaWVzdCBwb3NzaWJsZSBidWZmZXIgb3ZlcnJ1bi5cbiAgICBjb25zdCBtID0gdGhpcy5vcHQuTUFYX0JVRkZFUl9MRU5HVEggLSBtYXhBY3R1YWw7XG4gICAgdGhpcy5idWZmZXJDaGVja1Bvc2l0aW9uID0gbSArIHRoaXMucG9zaXRpb247XG4gIH1cblxuICBwcml2YXRlIG9wZW5UYWcoc2VsZkNsb3Npbmc/OiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMub3B0LnhtbG5zKSB7XG4gICAgICAvLyBlbWl0IG5hbWVzcGFjZSBiaW5kaW5nIGV2ZW50c1xuICAgICAgY29uc3QgdGFnID0gdGhpcy50YWc7XG5cbiAgICAgIC8vIGFkZCBuYW1lc3BhY2UgaW5mbyB0byB0YWdcbiAgICAgIGNvbnN0IHFuID0gU0FYLnFuYW1lKHRoaXMudGFnTmFtZSk7XG4gICAgICB0YWcucHJlZml4ID0gcW4ucHJlZml4O1xuICAgICAgdGFnLmxvY2FsID0gcW4ubG9jYWw7XG4gICAgICB0YWcudXJpID0gdGFnLm5zW3FuLnByZWZpeF0gfHwgJyc7XG5cbiAgICAgIGlmICh0YWcucHJlZml4ICYmICF0YWcudXJpKSB7XG4gICAgICAgIHRoaXMuc3RyaWN0RmFpbChcbiAgICAgICAgICAnVW5ib3VuZCBuYW1lc3BhY2UgcHJlZml4OiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy50YWdOYW1lKVxuICAgICAgICApO1xuICAgICAgICB0YWcudXJpID0gcW4ucHJlZml4O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnRhZ3NbdGhpcy50YWdzLmxlbmd0aCAtIDFdIHx8IHRoaXM7XG4gICAgICBpZiAodGFnLm5zICYmIHBhcmVudC5ucyAhPT0gdGFnLm5zKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBPYmplY3Qua2V5cyh0YWcubnMpLmZvckVhY2gocCA9PiB7XG4gICAgICAgICAgdGhhdC5lbWl0Tm9kZSgnb25vcGVubmFtZXNwYWNlJywge1xuICAgICAgICAgICAgcHJlZml4OiBwLFxuICAgICAgICAgICAgdXJpOiB0YWcubnNbcF0sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBoYW5kbGUgZGVmZXJyZWQgb25hdHRyaWJ1dGUgZXZlbnRzXG4gICAgICAvLyBOb3RlOiBkbyBub3QgYXBwbHkgZGVmYXVsdCBucyB0byBhdHRyaWJ1dGVzOlxuICAgICAgLy8gICBodHRwOi8vd3d3LnczLm9yZy9UUi9SRUMteG1sLW5hbWVzLyNkZWZhdWx0aW5nXG4gICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHRoaXMuYXR0cmliTGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgY29uc3QgbnYgPSB0aGlzLmF0dHJpYkxpc3RbaV07XG4gICAgICAgIGNvbnN0IG5hbWUgPSBudlswXTtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBudlsxXTtcbiAgICAgICAgY29uc3QgcXVhbE5hbWUgPSBTQVgucW5hbWUobmFtZSwgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHByZWZpeCA9IHF1YWxOYW1lLnByZWZpeDtcbiAgICAgICAgY29uc3QgbG9jYWwgPSBxdWFsTmFtZS5sb2NhbDtcbiAgICAgICAgY29uc3QgdXJpID0gcHJlZml4ID09PSAnJyA/ICcnIDogdGFnLm5zW3ByZWZpeF0gfHwgJyc7XG4gICAgICAgIGNvbnN0IGEgPSB7XG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBwcmVmaXgsXG4gICAgICAgICAgbG9jYWwsXG4gICAgICAgICAgdXJpLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGlmIHRoZXJlJ3MgYW55IGF0dHJpYnV0ZXMgd2l0aCBhbiB1bmRlZmluZWQgbmFtZXNwYWNlLFxuICAgICAgICAvLyB0aGVuIGZhaWwgb24gdGhlbSBub3cuXG4gICAgICAgIGlmIChwcmVmaXggJiYgcHJlZml4ICE9PSAneG1sbnMnICYmICF1cmkpIHtcbiAgICAgICAgICB0aGlzLnN0cmljdEZhaWwoXG4gICAgICAgICAgICAnVW5ib3VuZCBuYW1lc3BhY2UgcHJlZml4OiAnICsgSlNPTi5zdHJpbmdpZnkocHJlZml4KVxuICAgICAgICAgICk7XG4gICAgICAgICAgYS51cmkgPSBwcmVmaXg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50YWcuYXR0cmlidXRlc1tuYW1lXSA9IGE7XG4gICAgICAgIHRoaXMuZW1pdE5vZGUoJ29uYXR0cmlidXRlJywgYSk7XG4gICAgICB9XG4gICAgICB0aGlzLmF0dHJpYkxpc3QubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLnRhZy5pc1NlbGZDbG9zaW5nID0gISFzZWxmQ2xvc2luZztcblxuICAgIC8vIHByb2Nlc3MgdGhlIHRhZ1xuICAgIHRoaXMuc2F3Um9vdCA9IHRydWU7XG4gICAgdGhpcy50YWdzLnB1c2godGhpcy50YWcpO1xuICAgIHRoaXMuZW1pdE5vZGUoJ29ub3BlbnRhZycsIHRoaXMudGFnKTtcbiAgICBpZiAoIXNlbGZDbG9zaW5nKSB7XG4gICAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIDxzY3JpcHQ+IGluIG5vbi1zdHJpY3QgbW9kZS5cbiAgICAgIGlmICghdGhpcy5ub3NjcmlwdCAmJiB0aGlzLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5TQ1JJUFQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5TLlRFWFQ7XG4gICAgICB9XG4gICAgICB0aGlzLnRhZyA9IG51bGw7XG4gICAgICB0aGlzLnRhZ05hbWUgPSAnJztcbiAgICB9XG4gICAgdGhpcy5hdHRyaWJOYW1lID0gdGhpcy5hdHRyaWJWYWx1ZSA9ICcnO1xuICAgIHRoaXMuYXR0cmliTGlzdC5sZW5ndGggPSAwO1xuICB9XG5cbiAgcHJpdmF0ZSBjbG9zZVRhZygpIHtcbiAgICBpZiAoIXRoaXMudGFnTmFtZSkge1xuICAgICAgdGhpcy5zdHJpY3RGYWlsKCdXZWlyZCBlbXB0eSBjbG9zZSB0YWcuJyk7XG4gICAgICB0aGlzLnRleHROb2RlICs9ICc8Lz4nO1xuICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5URVhUO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNjcmlwdCkge1xuICAgICAgaWYgKHRoaXMudGFnTmFtZSAhPT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgdGhpcy5zY3JpcHQgKz0gJzwvJyArIHRoaXMudGFnTmFtZSArICc+JztcbiAgICAgICAgdGhpcy50YWdOYW1lID0gJyc7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuU0NSSVBUO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmVtaXROb2RlKCdvbnNjcmlwdCcsIHRoaXMuc2NyaXB0KTtcbiAgICAgIHRoaXMuc2NyaXB0ID0gJyc7XG4gICAgfVxuXG4gICAgLy8gZmlyc3QgbWFrZSBzdXJlIHRoYXQgdGhlIGNsb3NpbmcgdGFnIGFjdHVhbGx5IGV4aXN0cy5cbiAgICAvLyA8YT48Yj48L2M+PC9iPjwvYT4gd2lsbCBjbG9zZSBldmVyeXRoaW5nLCBvdGhlcndpc2UuXG4gICAgbGV0IHQgPSB0aGlzLnRhZ3MubGVuZ3RoO1xuICAgIGxldCB0YWdOYW1lID0gdGhpcy50YWdOYW1lO1xuICAgIGlmICghdGhpcy5zdHJpY3QpIHtcbiAgICAgIHRhZ05hbWUgPSB0YWdOYW1lW3RoaXMubG9vc2VDYXNlXSgpO1xuICAgIH1cbiAgICB3aGlsZSAodC0tKSB7XG4gICAgICBjb25zdCBjbG9zZSA9IHRoaXMudGFnc1t0XTtcbiAgICAgIGlmIChjbG9zZS5uYW1lICE9PSB0YWdOYW1lKSB7XG4gICAgICAgIC8vIGZhaWwgdGhlIGZpcnN0IHRpbWUgaW4gc3RyaWN0IG1vZGVcbiAgICAgICAgdGhpcy5zdHJpY3RGYWlsKCdVbmV4cGVjdGVkIGNsb3NlIHRhZycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGlkbid0IGZpbmQgaXQuICB3ZSBhbHJlYWR5IGZhaWxlZCBmb3Igc3RyaWN0LCBzbyBqdXN0IGFib3J0LlxuICAgIGlmICh0IDwgMCkge1xuICAgICAgdGhpcy5zdHJpY3RGYWlsKCdVbm1hdGNoZWQgY2xvc2luZyB0YWc6ICcgKyB0aGlzLnRhZ05hbWUpO1xuICAgICAgdGhpcy50ZXh0Tm9kZSArPSAnPC8nICsgdGhpcy50YWdOYW1lICsgJz4nO1xuICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuUy5URVhUO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lO1xuICAgIGxldCBzID0gdGhpcy50YWdzLmxlbmd0aDtcbiAgICB3aGlsZSAocy0tID4gdCkge1xuICAgICAgY29uc3QgdGFnID0gKHRoaXMudGFnID0gdGhpcy50YWdzLnBvcCgpKTtcbiAgICAgIHRoaXMudGFnTmFtZSA9IHRoaXMudGFnLm5hbWU7XG4gICAgICB0aGlzLmVtaXROb2RlKCdvbmNsb3NldGFnJywgdGhpcy50YWdOYW1lKTtcblxuICAgICAgY29uc3QgeDoge1tpbmRleDogc3RyaW5nXTogYW55fSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBpIGluIHRhZy5ucykge1xuICAgICAgICBpZiAodGFnLm5zLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgeFtpXSA9IHRhZy5uc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnRhZ3NbdGhpcy50YWdzLmxlbmd0aCAtIDFdIHx8IHRoaXM7XG4gICAgICBpZiAodGhpcy5vcHQueG1sbnMgJiYgdGFnLm5zICE9PSBwYXJlbnQubnMpIHtcbiAgICAgICAgLy8gcmVtb3ZlIG5hbWVzcGFjZSBiaW5kaW5ncyBpbnRyb2R1Y2VkIGJ5IHRhZ1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgT2JqZWN0LmtleXModGFnLm5zKS5mb3JFYWNoKHAgPT4ge1xuICAgICAgICAgIGNvbnN0IG4gPSB0YWcubnNbcF07XG4gICAgICAgICAgdGhhdC5lbWl0Tm9kZSgnb25jbG9zZW5hbWVzcGFjZScsIHtwcmVmaXg6IHAsIHVyaTogbn0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHQgPT09IDApIHRoaXMuY2xvc2VkUm9vdCA9IHRydWU7XG4gICAgdGhpcy50YWdOYW1lID0gdGhpcy5hdHRyaWJWYWx1ZSA9IHRoaXMuYXR0cmliTmFtZSA9ICcnO1xuICAgIHRoaXMuYXR0cmliTGlzdC5sZW5ndGggPSAwO1xuICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuVEVYVDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgU0FYUGFyc2VyIGV4dGVuZHMgU0FYIHtcbiAgY29uc3RydWN0b3Ioc3RyaWN0OiBib29sZWFuLCBvcHQ6IGFueSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU0FYUGFyc2VyKSkge1xuICAgICAgcmV0dXJuIG5ldyBTQVhQYXJzZXIoc3RyaWN0LCBvcHQpO1xuICAgIH1cblxuICAgIHRoaXMuY2xlYXJCdWZmZXJzKCk7XG4gICAgdGhpcy5xID0gdGhpcy5jID0gJyc7XG4gICAgdGhpcy5vcHQgPSB7TUFYX0JVRkZFUl9MRU5HVEg6IDY0ICogMTAyNCwgLi4ub3B0fTtcbiAgICB0aGlzLmJ1ZmZlckNoZWNrUG9zaXRpb24gPSB0aGlzLm9wdC5NQVhfQlVGRkVSX0xFTkdUSDtcbiAgICB0aGlzLm9wdC5sb3dlcmNhc2UgPSB0aGlzLm9wdC5sb3dlcmNhc2UgfHwgdGhpcy5vcHQubG93ZXJjYXNldGFncyB8fCBmYWxzZTtcbiAgICB0aGlzLmxvb3NlQ2FzZSA9IHRoaXMub3B0Lmxvd2VyY2FzZSA/ICd0b0xvd2VyQ2FzZScgOiAndG9VcHBlckNhc2UnO1xuICAgIHRoaXMudGFncyA9IFtdO1xuICAgIHRoaXMuY2xvc2VkID0gdGhpcy5jbG9zZWRSb290ID0gdGhpcy5zYXdSb290ID0gZmFsc2U7XG4gICAgdGhpcy50YWcgPSB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB0aGlzLnN0cmljdCA9ICEhc3RyaWN0O1xuICAgIHRoaXMubm9zY3JpcHQgPSAhIShzdHJpY3QgfHwgdGhpcy5vcHQubm9zY3JpcHQpO1xuICAgIHRoaXMuc3RhdGUgPSB0aGlzLlMuQkVHSU47XG4gICAgdGhpcy5zdHJpY3RFbnRpdGllcyA9IHRoaXMub3B0LnN0cmljdEVudGl0aWVzO1xuICAgIHRoaXMuRU5USVRJRVMgPSB0aGlzLnN0cmljdEVudGl0aWVzXG4gICAgICA/IE9iamVjdC5jcmVhdGUodGhpcy5YTUxfRU5USVRJRVMpXG4gICAgICA6IE9iamVjdC5jcmVhdGUodGhpcy5FTlRJVElFUyk7XG4gICAgdGhpcy5hdHRyaWJMaXN0ID0gW107XG5cbiAgICAvLyBuYW1lc3BhY2VzIGZvcm0gYSBwcm90b3R5cGUgY2hhaW4uXG4gICAgLy8gaXQgYWx3YXlzIHBvaW50cyBhdCB0aGUgY3VycmVudCB0YWcsXG4gICAgLy8gd2hpY2ggcHJvdG9zIHRvIGl0cyBwYXJlbnQgdGFnLlxuICAgIGlmICh0aGlzLm9wdC54bWxucykge1xuICAgICAgdGhpcy5ucyA9IE9iamVjdC5jcmVhdGUodGhpcy5yb290TlMpO1xuICAgIH1cblxuICAgIC8vIG1vc3RseSBqdXN0IGZvciBlcnJvciByZXBvcnRpbmdcbiAgICB0aGlzLnRyYWNrUG9zaXRpb24gPSB0aGlzLm9wdC5wb3NpdGlvbiAhPT0gZmFsc2U7XG4gICAgaWYgKHRoaXMudHJhY2tQb3NpdGlvbikge1xuICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMubGluZSA9IHRoaXMuY29sdW1uID0gMDtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCdvbnJlYWR5Jyk7XG4gIH1cblxuICAvLyBUT0RPOiB0cnkgdG8gbWFrZSBpdCBiZXR0ZXJcbiAgb250ZXh0OiBGdW5jdGlvbiA9ICgpID0+IHt9O1xuICBvbnByb2Nlc3NpbmdpbnN0cnVjdGlvbjogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25zZ21sZGVjbGFyYXRpb246IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9uZG9jdHlwZTogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25jb21tZW50OiBGdW5jdGlvbiA9ICgpID0+IHt9O1xuICBvbm9wZW50YWdzdGFydDogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25hdHRyaWJ1dGU6IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9ub3BlbnRhZzogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25jbG9zZXRhZzogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25vcGVuY2RhdGE6IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9uY2RhdGE6IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9uY2xvc2VjZGF0YTogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25lcnJvcjogRnVuY3Rpb24gPSAoKSA9PiB7fTtcbiAgb25lbmQ6IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9ucmVhZHk6IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9uc2NyaXB0OiBGdW5jdGlvbiA9ICgpID0+IHt9O1xuICBvbm9wZW5uYW1lc3BhY2U6IEZ1bmN0aW9uID0gKCkgPT4ge307XG4gIG9uY2xvc2VuYW1lc3BhY2U6IEZ1bmN0aW9uID0gKCkgPT4ge307XG5cbiAgcmVzdW1lKCkge1xuICAgIHRoaXMuZXJyb3IgPSBudWxsO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgY2xvc2UoKSB7XG4gICAgcmV0dXJuIHRoaXMud3JpdGUobnVsbCk7XG4gIH1cblxuICBmbHVzaCgpIHtcbiAgICB0aGlzLmZsdXNoQnVmZmVycygpO1xuICB9XG59XG4iXX0=