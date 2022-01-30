var State;
(function (State) {
    State[State["PASSTHROUGH"] = 0] = "PASSTHROUGH";
    State[State["PERCENT"] = 1] = "PERCENT";
    State[State["POSITIONAL"] = 2] = "POSITIONAL";
    State[State["PRECISION"] = 3] = "PRECISION";
    State[State["WIDTH"] = 4] = "WIDTH";
})(State || (State = {}));
var WorP;
(function (WorP) {
    WorP[WorP["WIDTH"] = 0] = "WIDTH";
    WorP[WorP["PRECISION"] = 1] = "PRECISION";
})(WorP || (WorP = {}));
class Flags {
    plus;
    dash;
    sharp;
    space;
    zero;
    lessthan;
    width = -1;
    precision = -1;
}
const min = Math.min;
const UNICODE_REPLACEMENT_CHARACTER = "\ufffd";
const DEFAULT_PRECISION = 6;
const FLOAT_REGEXP = /(-?)(\d)\.?(\d*)e([+-])(\d+)/;
var F;
(function (F) {
    F[F["sign"] = 1] = "sign";
    F[F["mantissa"] = 2] = "mantissa";
    F[F["fractional"] = 3] = "fractional";
    F[F["esign"] = 4] = "esign";
    F[F["exponent"] = 5] = "exponent";
})(F || (F = {}));
class Printf {
    format;
    args;
    i;
    state = State.PASSTHROUGH;
    verb = "";
    buf = "";
    argNum = 0;
    flags = new Flags();
    haveSeen;
    tmpError;
    constructor(format, ...args) {
        this.format = format;
        this.args = args;
        this.haveSeen = new Array(args.length);
        this.i = 0;
    }
    doPrintf() {
        for (; this.i < this.format.length; ++this.i) {
            const c = this.format[this.i];
            switch (this.state) {
                case State.PASSTHROUGH:
                    if (c === "%") {
                        this.state = State.PERCENT;
                    }
                    else {
                        this.buf += c;
                    }
                    break;
                case State.PERCENT:
                    if (c === "%") {
                        this.buf += c;
                        this.state = State.PASSTHROUGH;
                    }
                    else {
                        this.handleFormat();
                    }
                    break;
                default:
                    throw Error("Should be unreachable, certainly a bug in the lib.");
            }
        }
        let extras = false;
        let err = "%!(EXTRA";
        for (let i = 0; i !== this.haveSeen.length; ++i) {
            if (!this.haveSeen[i]) {
                extras = true;
                err += ` '${Deno.inspect(this.args[i])}'`;
            }
        }
        err += ")";
        if (extras) {
            this.buf += err;
        }
        return this.buf;
    }
    handleFormat() {
        this.flags = new Flags();
        const flags = this.flags;
        for (; this.i < this.format.length; ++this.i) {
            const c = this.format[this.i];
            switch (this.state) {
                case State.PERCENT:
                    switch (c) {
                        case "[":
                            this.handlePositional();
                            this.state = State.POSITIONAL;
                            break;
                        case "+":
                            flags.plus = true;
                            break;
                        case "<":
                            flags.lessthan = true;
                            break;
                        case "-":
                            flags.dash = true;
                            flags.zero = false;
                            break;
                        case "#":
                            flags.sharp = true;
                            break;
                        case " ":
                            flags.space = true;
                            break;
                        case "0":
                            flags.zero = !flags.dash;
                            break;
                        default:
                            if (("1" <= c && c <= "9") || c === "." || c === "*") {
                                if (c === ".") {
                                    this.flags.precision = 0;
                                    this.state = State.PRECISION;
                                    this.i++;
                                }
                                else {
                                    this.state = State.WIDTH;
                                }
                                this.handleWidthAndPrecision(flags);
                            }
                            else {
                                this.handleVerb();
                                return;
                            }
                    }
                    break;
                case State.POSITIONAL:
                    if (c === "*") {
                        const worp = this.flags.precision === -1
                            ? WorP.WIDTH
                            : WorP.PRECISION;
                        this.handleWidthOrPrecisionRef(worp);
                        this.state = State.PERCENT;
                        break;
                    }
                    else {
                        this.handleVerb();
                        return;
                    }
                default:
                    throw new Error(`Should not be here ${this.state}, library bug!`);
            }
        }
    }
    handleWidthOrPrecisionRef(wOrP) {
        if (this.argNum >= this.args.length) {
            return;
        }
        const arg = this.args[this.argNum];
        this.haveSeen[this.argNum] = true;
        if (typeof arg === "number") {
            switch (wOrP) {
                case WorP.WIDTH:
                    this.flags.width = arg;
                    break;
                default:
                    this.flags.precision = arg;
            }
        }
        else {
            const tmp = wOrP === WorP.WIDTH ? "WIDTH" : "PREC";
            this.tmpError = `%!(BAD ${tmp} '${this.args[this.argNum]}')`;
        }
        this.argNum++;
    }
    handleWidthAndPrecision(flags) {
        const fmt = this.format;
        for (; this.i !== this.format.length; ++this.i) {
            const c = fmt[this.i];
            switch (this.state) {
                case State.WIDTH:
                    switch (c) {
                        case ".":
                            this.flags.precision = 0;
                            this.state = State.PRECISION;
                            break;
                        case "*":
                            this.handleWidthOrPrecisionRef(WorP.WIDTH);
                            break;
                        default: {
                            const val = parseInt(c);
                            if (isNaN(val)) {
                                this.i--;
                                this.state = State.PERCENT;
                                return;
                            }
                            flags.width = flags.width == -1 ? 0 : flags.width;
                            flags.width *= 10;
                            flags.width += val;
                        }
                    }
                    break;
                case State.PRECISION: {
                    if (c === "*") {
                        this.handleWidthOrPrecisionRef(WorP.PRECISION);
                        break;
                    }
                    const val = parseInt(c);
                    if (isNaN(val)) {
                        this.i--;
                        this.state = State.PERCENT;
                        return;
                    }
                    flags.precision *= 10;
                    flags.precision += val;
                    break;
                }
                default:
                    throw new Error("can't be here. bug.");
            }
        }
    }
    handlePositional() {
        if (this.format[this.i] !== "[") {
            throw new Error("Can't happen? Bug.");
        }
        let positional = 0;
        const format = this.format;
        this.i++;
        let err = false;
        for (; this.i !== this.format.length; ++this.i) {
            if (format[this.i] === "]") {
                break;
            }
            positional *= 10;
            const val = parseInt(format[this.i]);
            if (isNaN(val)) {
                this.tmpError = "%!(BAD INDEX)";
                err = true;
            }
            positional += val;
        }
        if (positional - 1 >= this.args.length) {
            this.tmpError = "%!(BAD INDEX)";
            err = true;
        }
        this.argNum = err ? this.argNum : positional - 1;
        return;
    }
    handleLessThan() {
        const arg = this.args[this.argNum];
        if ((arg || {}).constructor.name !== "Array") {
            throw new Error(`arg ${arg} is not an array. Todo better error handling`);
        }
        let str = "[ ";
        for (let i = 0; i !== arg.length; ++i) {
            if (i !== 0)
                str += ", ";
            str += this._handleVerb(arg[i]);
        }
        return str + " ]";
    }
    handleVerb() {
        const verb = this.format[this.i];
        this.verb = verb;
        if (this.tmpError) {
            this.buf += this.tmpError;
            this.tmpError = undefined;
            if (this.argNum < this.haveSeen.length) {
                this.haveSeen[this.argNum] = true;
            }
        }
        else if (this.args.length <= this.argNum) {
            this.buf += `%!(MISSING '${verb}')`;
        }
        else {
            const arg = this.args[this.argNum];
            this.haveSeen[this.argNum] = true;
            if (this.flags.lessthan) {
                this.buf += this.handleLessThan();
            }
            else {
                this.buf += this._handleVerb(arg);
            }
        }
        this.argNum++;
        this.state = State.PASSTHROUGH;
    }
    _handleVerb(arg) {
        switch (this.verb) {
            case "t":
                return this.pad(arg.toString());
            case "b":
                return this.fmtNumber(arg, 2);
            case "c":
                return this.fmtNumberCodePoint(arg);
            case "d":
                return this.fmtNumber(arg, 10);
            case "o":
                return this.fmtNumber(arg, 8);
            case "x":
                return this.fmtHex(arg);
            case "X":
                return this.fmtHex(arg, true);
            case "e":
                return this.fmtFloatE(arg);
            case "E":
                return this.fmtFloatE(arg, true);
            case "f":
            case "F":
                return this.fmtFloatF(arg);
            case "g":
                return this.fmtFloatG(arg);
            case "G":
                return this.fmtFloatG(arg, true);
            case "s":
                return this.fmtString(arg);
            case "T":
                return this.fmtString(typeof arg);
            case "v":
                return this.fmtV(arg);
            case "j":
                return this.fmtJ(arg);
            default:
                return `%!(BAD VERB '${this.verb}')`;
        }
    }
    pad(s) {
        const padding = this.flags.zero ? "0" : " ";
        if (this.flags.dash) {
            return s.padEnd(this.flags.width, padding);
        }
        return s.padStart(this.flags.width, padding);
    }
    padNum(nStr, neg) {
        let sign;
        if (neg) {
            sign = "-";
        }
        else if (this.flags.plus || this.flags.space) {
            sign = this.flags.plus ? "+" : " ";
        }
        else {
            sign = "";
        }
        const zero = this.flags.zero;
        if (!zero) {
            nStr = sign + nStr;
        }
        const pad = zero ? "0" : " ";
        const len = zero ? this.flags.width - sign.length : this.flags.width;
        if (this.flags.dash) {
            nStr = nStr.padEnd(len, pad);
        }
        else {
            nStr = nStr.padStart(len, pad);
        }
        if (zero) {
            nStr = sign + nStr;
        }
        return nStr;
    }
    fmtNumber(n, radix, upcase = false) {
        let num = Math.abs(n).toString(radix);
        const prec = this.flags.precision;
        if (prec !== -1) {
            this.flags.zero = false;
            num = n === 0 && prec === 0 ? "" : num;
            while (num.length < prec) {
                num = "0" + num;
            }
        }
        let prefix = "";
        if (this.flags.sharp) {
            switch (radix) {
                case 2:
                    prefix += "0b";
                    break;
                case 8:
                    prefix += num.startsWith("0") ? "" : "0";
                    break;
                case 16:
                    prefix += "0x";
                    break;
                default:
                    throw new Error("cannot handle base: " + radix);
            }
        }
        num = num.length === 0 ? num : prefix + num;
        if (upcase) {
            num = num.toUpperCase();
        }
        return this.padNum(num, n < 0);
    }
    fmtNumberCodePoint(n) {
        let s = "";
        try {
            s = String.fromCodePoint(n);
        }
        catch {
            s = UNICODE_REPLACEMENT_CHARACTER;
        }
        return this.pad(s);
    }
    fmtFloatSpecial(n) {
        if (isNaN(n)) {
            this.flags.zero = false;
            return this.padNum("NaN", false);
        }
        if (n === Number.POSITIVE_INFINITY) {
            this.flags.zero = false;
            this.flags.plus = true;
            return this.padNum("Inf", false);
        }
        if (n === Number.NEGATIVE_INFINITY) {
            this.flags.zero = false;
            return this.padNum("Inf", true);
        }
        return "";
    }
    roundFractionToPrecision(fractional, precision) {
        if (fractional.length > precision) {
            fractional = "1" + fractional;
            let tmp = parseInt(fractional.substr(0, precision + 2)) / 10;
            tmp = Math.round(tmp);
            fractional = Math.floor(tmp).toString();
            fractional = fractional.substr(1);
        }
        else {
            while (fractional.length < precision) {
                fractional += "0";
            }
        }
        return fractional;
    }
    fmtFloatE(n, upcase = false) {
        const special = this.fmtFloatSpecial(n);
        if (special !== "") {
            return special;
        }
        const m = n.toExponential().match(FLOAT_REGEXP);
        if (!m) {
            throw Error("can't happen, bug");
        }
        let fractional = m[F.fractional];
        const precision = this.flags.precision !== -1
            ? this.flags.precision
            : DEFAULT_PRECISION;
        fractional = this.roundFractionToPrecision(fractional, precision);
        let e = m[F.exponent];
        e = e.length == 1 ? "0" + e : e;
        const val = `${m[F.mantissa]}.${fractional}${upcase ? "E" : "e"}${m[F.esign]}${e}`;
        return this.padNum(val, n < 0);
    }
    fmtFloatF(n) {
        const special = this.fmtFloatSpecial(n);
        if (special !== "") {
            return special;
        }
        function expandNumber(n) {
            if (Number.isSafeInteger(n)) {
                return n.toString() + ".";
            }
            const t = n.toExponential().split("e");
            let m = t[0].replace(".", "");
            const e = parseInt(t[1]);
            if (e < 0) {
                let nStr = "0.";
                for (let i = 0; i !== Math.abs(e) - 1; ++i) {
                    nStr += "0";
                }
                return (nStr += m);
            }
            else {
                const splIdx = e + 1;
                while (m.length < splIdx) {
                    m += "0";
                }
                return m.substr(0, splIdx) + "." + m.substr(splIdx);
            }
        }
        const val = expandNumber(Math.abs(n));
        const arr = val.split(".");
        const dig = arr[0];
        let fractional = arr[1];
        const precision = this.flags.precision !== -1
            ? this.flags.precision
            : DEFAULT_PRECISION;
        fractional = this.roundFractionToPrecision(fractional, precision);
        return this.padNum(`${dig}.${fractional}`, n < 0);
    }
    fmtFloatG(n, upcase = false) {
        const special = this.fmtFloatSpecial(n);
        if (special !== "") {
            return special;
        }
        let P = this.flags.precision !== -1
            ? this.flags.precision
            : DEFAULT_PRECISION;
        P = P === 0 ? 1 : P;
        const m = n.toExponential().match(FLOAT_REGEXP);
        if (!m) {
            throw Error("can't happen");
        }
        const X = parseInt(m[F.exponent]) * (m[F.esign] === "-" ? -1 : 1);
        let nStr = "";
        if (P > X && X >= -4) {
            this.flags.precision = P - (X + 1);
            nStr = this.fmtFloatF(n);
            if (!this.flags.sharp) {
                nStr = nStr.replace(/\.?0*$/, "");
            }
        }
        else {
            this.flags.precision = P - 1;
            nStr = this.fmtFloatE(n);
            if (!this.flags.sharp) {
                nStr = nStr.replace(/\.?0*e/, upcase ? "E" : "e");
            }
        }
        return nStr;
    }
    fmtString(s) {
        if (this.flags.precision !== -1) {
            s = s.substr(0, this.flags.precision);
        }
        return this.pad(s);
    }
    fmtHex(val, upper = false) {
        switch (typeof val) {
            case "number":
                return this.fmtNumber(val, 16, upper);
            case "string": {
                const sharp = this.flags.sharp && val.length !== 0;
                let hex = sharp ? "0x" : "";
                const prec = this.flags.precision;
                const end = prec !== -1 ? min(prec, val.length) : val.length;
                for (let i = 0; i !== end; ++i) {
                    if (i !== 0 && this.flags.space) {
                        hex += sharp ? " 0x" : " ";
                    }
                    const c = (val.charCodeAt(i) & 0xff).toString(16);
                    hex += c.length === 1 ? `0${c}` : c;
                }
                if (upper) {
                    hex = hex.toUpperCase();
                }
                return this.pad(hex);
            }
            default:
                throw new Error("currently only number and string are implemented for hex");
        }
    }
    fmtV(val) {
        if (this.flags.sharp) {
            const options = this.flags.precision !== -1
                ? { depth: this.flags.precision }
                : {};
            return this.pad(Deno.inspect(val, options));
        }
        else {
            const p = this.flags.precision;
            return p === -1 ? val.toString() : val.toString().substr(0, p);
        }
    }
    fmtJ(val) {
        return JSON.stringify(val);
    }
}
export function sprintf(format, ...args) {
    const printf = new Printf(format, ...args);
    return printf.doPrintf();
}
export function printf(format, ...args) {
    const s = sprintf(format, ...args);
    Deno.stdout.writeSync(new TextEncoder().encode(s));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpbnRmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJpbnRmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLElBQUssS0FNSjtBQU5ELFdBQUssS0FBSztJQUNSLCtDQUFXLENBQUE7SUFDWCx1Q0FBTyxDQUFBO0lBQ1AsNkNBQVUsQ0FBQTtJQUNWLDJDQUFTLENBQUE7SUFDVCxtQ0FBSyxDQUFBO0FBQ1AsQ0FBQyxFQU5JLEtBQUssS0FBTCxLQUFLLFFBTVQ7QUFFRCxJQUFLLElBR0o7QUFIRCxXQUFLLElBQUk7SUFDUCxpQ0FBSyxDQUFBO0lBQ0wseUNBQVMsQ0FBQTtBQUNYLENBQUMsRUFISSxJQUFJLEtBQUosSUFBSSxRQUdSO0FBRUQsTUFBTSxLQUFLO0lBQ1QsSUFBSSxDQUFXO0lBQ2YsSUFBSSxDQUFXO0lBQ2YsS0FBSyxDQUFXO0lBQ2hCLEtBQUssQ0FBVztJQUNoQixJQUFJLENBQVc7SUFDZixRQUFRLENBQVc7SUFDbkIsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ1gsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0NBQ2hCO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNyQixNQUFNLDZCQUE2QixHQUFHLFFBQVEsQ0FBQztBQUMvQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUM1QixNQUFNLFlBQVksR0FBRyw4QkFBOEIsQ0FBQztBQUVwRCxJQUFLLENBTUo7QUFORCxXQUFLLENBQUM7SUFDSix5QkFBUSxDQUFBO0lBQ1IsaUNBQVEsQ0FBQTtJQUNSLHFDQUFVLENBQUE7SUFDViwyQkFBSyxDQUFBO0lBQ0wsaUNBQVEsQ0FBQTtBQUNWLENBQUMsRUFOSSxDQUFDLEtBQUQsQ0FBQyxRQU1MO0FBRUQsTUFBTSxNQUFNO0lBQ1YsTUFBTSxDQUFTO0lBQ2YsSUFBSSxDQUFZO0lBQ2hCLENBQUMsQ0FBUztJQUVWLEtBQUssR0FBVSxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQ2pDLElB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VUFBVSxNQUFNLENBQUMsTUFBYyxFQUFFLEdBQUcsSUFBZTtJQUN2RCxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8qKlxuICogVGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBpbnNwaXJlZCBieSBQT1NJWCBhbmQgR29sYW5nIGJ1dCBkb2VzIG5vdCBwb3J0XG4gKiBpbXBsZW1lbnRhdGlvbiBjb2RlLiAqL1xuXG5lbnVtIFN0YXRlIHtcbiAgUEFTU1RIUk9VR0gsXG4gIFBFUkNFTlQsXG4gIFBPU0lUSU9OQUwsXG4gIFBSRUNJU0lPTixcbiAgV0lEVEgsXG59XG5cbmVudW0gV29yUCB7XG4gIFdJRFRILFxuICBQUkVDSVNJT04sXG59XG5cbmNsYXNzIEZsYWdzIHtcbiAgcGx1cz86IGJvb2xlYW47XG4gIGRhc2g/OiBib29sZWFuO1xuICBzaGFycD86IGJvb2xlYW47XG4gIHNwYWNlPzogYm9vbGVhbjtcbiAgemVybz86IGJvb2xlYW47XG4gIGxlc3N0aGFuPzogYm9vbGVhbjtcbiAgd2lkdGggPSAtMTtcbiAgcHJlY2lzaW9uID0gLTE7XG59XG5cbmNvbnN0IG1pbiA9IE1hdGgubWluO1xuY29uc3QgVU5JQ09ERV9SRVBMQUNFTUVOVF9DSEFSQUNURVIgPSBcIlxcdWZmZmRcIjtcbmNvbnN0IERFRkFVTFRfUFJFQ0lTSU9OID0gNjtcbmNvbnN0IEZMT0FUX1JFR0VYUCA9IC8oLT8pKFxcZClcXC4/KFxcZCopZShbKy1dKShcXGQrKS87XG5cbmVudW0gRiB7XG4gIHNpZ24gPSAxLFxuICBtYW50aXNzYSxcbiAgZnJhY3Rpb25hbCxcbiAgZXNpZ24sXG4gIGV4cG9uZW50LFxufVxuXG5jbGFzcyBQcmludGYge1xuICBmb3JtYXQ6IHN0cmluZztcbiAgYXJnczogdW5rbm93bltdO1xuICBpOiBudW1iZXI7XG5cbiAgc3RhdGU6IFN0YXRlID0gU3RhdGUuUEFTU1RIUk9VR0g7XG4gIHZlcmIgPSBcIlwiO1xuICBidWYgPSBcIlwiO1xuICBhcmdOdW0gPSAwO1xuICBmbGFnczogRmxhZ3MgPSBuZXcgRmxhZ3MoKTtcblxuICBoYXZlU2VlbjogYm9vbGVhbltdO1xuXG4gIC8vIGJhcmYsIHN0b3JlIHByZWNpc2lvbiBhbmQgd2lkdGggZXJyb3JzIGZvciBsYXRlciBwcm9jZXNzaW5nIC4uLlxuICB0bXBFcnJvcj86IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihmb3JtYXQ6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgdGhpcy5mb3JtYXQgPSBmb3JtYXQ7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgICB0aGlzLmhhdmVTZWVuID0gbmV3IEFycmF5KGFyZ3MubGVuZ3RoKTtcbiAgICB0aGlzLmkgPSAwO1xuICB9XG5cbiAgZG9QcmludGYoKTogc3RyaW5nIHtcbiAgICBmb3IgKDsgdGhpcy5pIDwgdGhpcy5mb3JtYXQubGVuZ3RoOyArK3RoaXMuaSkge1xuICAgICAgY29uc3QgYyA9IHRoaXMuZm9ybWF0W3RoaXMuaV07XG4gICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgY2FzZSBTdGF0ZS5QQVNTVEhST1VHSDpcbiAgICAgICAgICBpZiAoYyA9PT0gXCIlXCIpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5QRVJDRU5UO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmJ1ZiArPSBjO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBTdGF0ZS5QRVJDRU5UOlxuICAgICAgICAgIGlmIChjID09PSBcIiVcIikge1xuICAgICAgICAgICAgdGhpcy5idWYgKz0gYztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5QQVNTVEhST1VHSDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVGb3JtYXQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgRXJyb3IoXCJTaG91bGQgYmUgdW5yZWFjaGFibGUsIGNlcnRhaW5seSBhIGJ1ZyBpbiB0aGUgbGliLlwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY2hlY2sgZm9yIHVuaGFuZGxlZCBhcmdzXG4gICAgbGV0IGV4dHJhcyA9IGZhbHNlO1xuICAgIGxldCBlcnIgPSBcIiUhKEVYVFJBXCI7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgIT09IHRoaXMuaGF2ZVNlZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmICghdGhpcy5oYXZlU2VlbltpXSkge1xuICAgICAgICBleHRyYXMgPSB0cnVlO1xuICAgICAgICBlcnIgKz0gYCAnJHtEZW5vLmluc3BlY3QodGhpcy5hcmdzW2ldKX0nYDtcbiAgICAgIH1cbiAgICB9XG4gICAgZXJyICs9IFwiKVwiO1xuICAgIGlmIChleHRyYXMpIHtcbiAgICAgIHRoaXMuYnVmICs9IGVycjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYnVmO1xuICB9XG5cbiAgLy8gJVs8cG9zaXRpb25hbD5dPGZsYWc+Li4uPHZlcmI+XG4gIGhhbmRsZUZvcm1hdCgpOiB2b2lkIHtcbiAgICB0aGlzLmZsYWdzID0gbmV3IEZsYWdzKCk7XG4gICAgY29uc3QgZmxhZ3MgPSB0aGlzLmZsYWdzO1xuICAgIGZvciAoOyB0aGlzLmkgPCB0aGlzLmZvcm1hdC5sZW5ndGg7ICsrdGhpcy5pKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5mb3JtYXRbdGhpcy5pXTtcbiAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICBjYXNlIFN0YXRlLlBFUkNFTlQ6XG4gICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICBjYXNlIFwiW1wiOlxuICAgICAgICAgICAgICB0aGlzLmhhbmRsZVBvc2l0aW9uYWwoKTtcbiAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlBPU0lUSU9OQUw7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgICAgZmxhZ3MucGx1cyA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjxcIjpcbiAgICAgICAgICAgICAgZmxhZ3MubGVzc3RoYW4gPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCItXCI6XG4gICAgICAgICAgICAgIGZsYWdzLmRhc2ggPSB0cnVlO1xuICAgICAgICAgICAgICBmbGFncy56ZXJvID0gZmFsc2U7IC8vIG9ubHkgbGVmdCBwYWQgemVyb3MsIGRhc2ggdGFrZXMgcHJlY2VkZW5jZVxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIjXCI6XG4gICAgICAgICAgICAgIGZsYWdzLnNoYXJwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiIFwiOlxuICAgICAgICAgICAgICBmbGFncy5zcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjBcIjpcbiAgICAgICAgICAgICAgLy8gb25seSBsZWZ0IHBhZCB6ZXJvcywgZGFzaCB0YWtlcyBwcmVjZWRlbmNlXG4gICAgICAgICAgICAgIGZsYWdzLnplcm8gPSAhZmxhZ3MuZGFzaDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICBpZiAoKFwiMVwiIDw9IGMgJiYgYyA8PSBcIjlcIikgfHwgYyA9PT0gXCIuXCIgfHwgYyA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gXCIuXCIpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuZmxhZ3MucHJlY2lzaW9uID0gMDtcbiAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5QUkVDSVNJT047XG4gICAgICAgICAgICAgICAgICB0aGlzLmkrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLldJRFRIO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVdpZHRoQW5kUHJlY2lzaW9uKGZsYWdzKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZlcmIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIGFsd2F5cyBlbmQgaW4gdmVyYlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSAvLyBzd2l0Y2ggY1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFN0YXRlLlBPU0lUSU9OQUw6XG4gICAgICAgICAgLy8gVE9ETyhiYXJ0bG9taWVqdSk6IGVpdGhlciBhIHZlcmIgb3IgKiBvbmx5IHZlcmIgZm9yIG5vd1xuICAgICAgICAgIGlmIChjID09PSBcIipcIikge1xuICAgICAgICAgICAgY29uc3Qgd29ycCA9IHRoaXMuZmxhZ3MucHJlY2lzaW9uID09PSAtMVxuICAgICAgICAgICAgICA/IFdvclAuV0lEVEhcbiAgICAgICAgICAgICAgOiBXb3JQLlBSRUNJU0lPTjtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlV2lkdGhPclByZWNpc2lvblJlZih3b3JwKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5QRVJDRU5UO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlVmVyYigpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBhbHdheXMgZW5kIGluIHZlcmJcbiAgICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTaG91bGQgbm90IGJlIGhlcmUgJHt0aGlzLnN0YXRlfSwgbGlicmFyeSBidWchYCk7XG4gICAgICB9IC8vIHN3aXRjaCBzdGF0ZVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgd2lkdGggb3IgcHJlY2lzaW9uXG4gICAqIEBwYXJhbSB3T3JQXG4gICAqL1xuICBoYW5kbGVXaWR0aE9yUHJlY2lzaW9uUmVmKHdPclA6IFdvclApOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hcmdOdW0gPj0gdGhpcy5hcmdzLmxlbmd0aCkge1xuICAgICAgLy8gaGFuZGxlIFBvc2l0aW9uYWwgc2hvdWxkIGhhdmUgYWxyZWFkeSB0YWtlbiBjYXJlIG9mIGl0Li4uXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGFyZyA9IHRoaXMuYXJnc1t0aGlzLmFyZ051bV07XG4gICAgdGhpcy5oYXZlU2Vlblt0aGlzLmFyZ051bV0gPSB0cnVlO1xuICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm51bWJlclwiKSB7XG4gICAgICBzd2l0Y2ggKHdPclApIHtcbiAgICAgICAgY2FzZSBXb3JQLldJRFRIOlxuICAgICAgICAgIHRoaXMuZmxhZ3Mud2lkdGggPSBhcmc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhpcy5mbGFncy5wcmVjaXNpb24gPSBhcmc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRtcCA9IHdPclAgPT09IFdvclAuV0lEVEggPyBcIldJRFRIXCIgOiBcIlBSRUNcIjtcbiAgICAgIHRoaXMudG1wRXJyb3IgPSBgJSEoQkFEICR7dG1wfSAnJHt0aGlzLmFyZ3NbdGhpcy5hcmdOdW1dfScpYDtcbiAgICB9XG4gICAgdGhpcy5hcmdOdW0rKztcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgd2lkdGggYW5kIHByZWNpc2lvblxuICAgKiBAcGFyYW0gZmxhZ3NcbiAgICovXG4gIGhhbmRsZVdpZHRoQW5kUHJlY2lzaW9uKGZsYWdzOiBGbGFncyk6IHZvaWQge1xuICAgIGNvbnN0IGZtdCA9IHRoaXMuZm9ybWF0O1xuICAgIGZvciAoOyB0aGlzLmkgIT09IHRoaXMuZm9ybWF0Lmxlbmd0aDsgKyt0aGlzLmkpIHtcbiAgICAgIGNvbnN0IGMgPSBmbXRbdGhpcy5pXTtcbiAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICBjYXNlIFN0YXRlLldJRFRIOlxuICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgY2FzZSBcIi5cIjpcbiAgICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBwcmVjaXNpb24sICU5LmYgLT4gcHJlY2lzaW9uPTBcbiAgICAgICAgICAgICAgdGhpcy5mbGFncy5wcmVjaXNpb24gPSAwO1xuICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuUFJFQ0lTSU9OO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIqXCI6XG4gICAgICAgICAgICAgIHRoaXMuaGFuZGxlV2lkdGhPclByZWNpc2lvblJlZihXb3JQLldJRFRIKTtcbiAgICAgICAgICAgICAgLy8gZm9yY2UgLiBvciBmbGFnIGF0IHRoaXMgcG9pbnRcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlSW50KGMpO1xuICAgICAgICAgICAgICAvLyBtb3N0IGxpa2VseSBwYXJzZUludCBkb2VzIHNvbWV0aGluZyBzdHVwaWQgdGhhdCBtYWtlc1xuICAgICAgICAgICAgICAvLyBpdCB1bnVzYWJsZSBmb3IgdGhpcyBzY2VuYXJpbyAuLi5cbiAgICAgICAgICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGEgbm9uIChudW1iZXJ8KnwuKSB3ZSdyZSBkb25lIHdpdGggcHJlYyAmIHdpZFxuICAgICAgICAgICAgICBpZiAoaXNOYU4odmFsKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaS0tO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5QRVJDRU5UO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmbGFncy53aWR0aCA9IGZsYWdzLndpZHRoID09IC0xID8gMCA6IGZsYWdzLndpZHRoO1xuICAgICAgICAgICAgICBmbGFncy53aWR0aCAqPSAxMDtcbiAgICAgICAgICAgICAgZmxhZ3Mud2lkdGggKz0gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gLy8gc3dpdGNoIGNcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBTdGF0ZS5QUkVDSVNJT046IHtcbiAgICAgICAgICBpZiAoYyA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlV2lkdGhPclByZWNpc2lvblJlZihXb3JQLlBSRUNJU0lPTik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdmFsID0gcGFyc2VJbnQoYyk7XG4gICAgICAgICAgaWYgKGlzTmFOKHZhbCkpIHtcbiAgICAgICAgICAgIC8vIG9uZSB0b28gZmFyLCByZXdpbmRcbiAgICAgICAgICAgIHRoaXMuaS0tO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlBFUkNFTlQ7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGZsYWdzLnByZWNpc2lvbiAqPSAxMDtcbiAgICAgICAgICBmbGFncy5wcmVjaXNpb24gKz0gdmFsO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2FuJ3QgYmUgaGVyZS4gYnVnLlwiKTtcbiAgICAgIH0gLy8gc3dpdGNoIHN0YXRlXG4gICAgfVxuICB9XG5cbiAgLyoqIEhhbmRsZSBwb3NpdGlvbmFsICovXG4gIGhhbmRsZVBvc2l0aW9uYWwoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZm9ybWF0W3RoaXMuaV0gIT09IFwiW1wiKSB7XG4gICAgICAvLyBzYW5pdHkgb25seVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgaGFwcGVuPyBCdWcuXCIpO1xuICAgIH1cbiAgICBsZXQgcG9zaXRpb25hbCA9IDA7XG4gICAgY29uc3QgZm9ybWF0ID0gdGhpcy5mb3JtYXQ7XG4gICAgdGhpcy5pKys7XG4gICAgbGV0IGVyciA9IGZhbHNlO1xuICAgIGZvciAoOyB0aGlzLmkgIT09IHRoaXMuZm9ybWF0Lmxlbmd0aDsgKyt0aGlzLmkpIHtcbiAgICAgIGlmIChmb3JtYXRbdGhpcy5pXSA9PT0gXCJdXCIpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBwb3NpdGlvbmFsICo9IDEwO1xuICAgICAgY29uc3QgdmFsID0gcGFyc2VJbnQoZm9ybWF0W3RoaXMuaV0pO1xuICAgICAgaWYgKGlzTmFOKHZhbCkpIHtcbiAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIC8vICBgaW52YWxpZCBjaGFyYWN0ZXIgaW4gcG9zaXRpb25hbDogJHtmb3JtYXR9WyR7Zm9ybWF0W3RoaXMuaV19XWBcbiAgICAgICAgLy8pO1xuICAgICAgICB0aGlzLnRtcEVycm9yID0gXCIlIShCQUQgSU5ERVgpXCI7XG4gICAgICAgIGVyciA9IHRydWU7XG4gICAgICB9XG4gICAgICBwb3NpdGlvbmFsICs9IHZhbDtcbiAgICB9XG4gICAgaWYgKHBvc2l0aW9uYWwgLSAxID49IHRoaXMuYXJncy5sZW5ndGgpIHtcbiAgICAgIHRoaXMudG1wRXJyb3IgPSBcIiUhKEJBRCBJTkRFWClcIjtcbiAgICAgIGVyciA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuYXJnTnVtID0gZXJyID8gdGhpcy5hcmdOdW0gOiBwb3NpdGlvbmFsIC0gMTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvKiogSGFuZGxlIGxlc3MgdGhhbiAqL1xuICBoYW5kbGVMZXNzVGhhbigpOiBzdHJpbmcge1xuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgYXJnID0gdGhpcy5hcmdzW3RoaXMuYXJnTnVtXSBhcyBhbnk7XG4gICAgaWYgKChhcmcgfHwge30pLmNvbnN0cnVjdG9yLm5hbWUgIT09IFwiQXJyYXlcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcmcgJHthcmd9IGlzIG5vdCBhbiBhcnJheS4gVG9kbyBiZXR0ZXIgZXJyb3IgaGFuZGxpbmdgKTtcbiAgICB9XG4gICAgbGV0IHN0ciA9IFwiWyBcIjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSAhPT0gYXJnLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAoaSAhPT0gMCkgc3RyICs9IFwiLCBcIjtcbiAgICAgIHN0ciArPSB0aGlzLl9oYW5kbGVWZXJiKGFyZ1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBzdHIgKyBcIiBdXCI7XG4gIH1cblxuICAvKiogSGFuZGxlIHZlcmIgKi9cbiAgaGFuZGxlVmVyYigpOiB2b2lkIHtcbiAgICBjb25zdCB2ZXJiID0gdGhpcy5mb3JtYXRbdGhpcy5pXTtcbiAgICB0aGlzLnZlcmIgPSB2ZXJiO1xuICAgIGlmICh0aGlzLnRtcEVycm9yKSB7XG4gICAgICB0aGlzLmJ1ZiArPSB0aGlzLnRtcEVycm9yO1xuICAgICAgdGhpcy50bXBFcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGlmICh0aGlzLmFyZ051bSA8IHRoaXMuaGF2ZVNlZW4ubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuaGF2ZVNlZW5bdGhpcy5hcmdOdW1dID0gdHJ1ZTsgLy8ga2VlcCB0cmFjayBvZiB1c2VkIGFyZ3NcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuYXJncy5sZW5ndGggPD0gdGhpcy5hcmdOdW0pIHtcbiAgICAgIHRoaXMuYnVmICs9IGAlIShNSVNTSU5HICcke3ZlcmJ9JylgO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBhcmcgPSB0aGlzLmFyZ3NbdGhpcy5hcmdOdW1dOyAvLyBjaGVjayBvdXQgb2YgcmFuZ2VcbiAgICAgIHRoaXMuaGF2ZVNlZW5bdGhpcy5hcmdOdW1dID0gdHJ1ZTsgLy8ga2VlcCB0cmFjayBvZiB1c2VkIGFyZ3NcbiAgICAgIGlmICh0aGlzLmZsYWdzLmxlc3N0aGFuKSB7XG4gICAgICAgIHRoaXMuYnVmICs9IHRoaXMuaGFuZGxlTGVzc1RoYW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnVmICs9IHRoaXMuX2hhbmRsZVZlcmIoYXJnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hcmdOdW0rKzsgLy8gaWYgdGhlcmUgaXMgYSBmdXJ0aGVyIHBvc2l0aW9uYWwsIGl0IHdpbGwgcmVzZXQuXG4gICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlBBU1NUSFJPVUdIO1xuICB9XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgX2hhbmRsZVZlcmIoYXJnOiBhbnkpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAodGhpcy52ZXJiKSB7XG4gICAgICBjYXNlIFwidFwiOlxuICAgICAgICByZXR1cm4gdGhpcy5wYWQoYXJnLnRvU3RyaW5nKCkpO1xuICAgICAgY2FzZSBcImJcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10TnVtYmVyKGFyZyBhcyBudW1iZXIsIDIpO1xuICAgICAgY2FzZSBcImNcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10TnVtYmVyQ29kZVBvaW50KGFyZyBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10TnVtYmVyKGFyZyBhcyBudW1iZXIsIDEwKTtcbiAgICAgIGNhc2UgXCJvXCI6XG4gICAgICAgIHJldHVybiB0aGlzLmZtdE51bWJlcihhcmcgYXMgbnVtYmVyLCA4KTtcbiAgICAgIGNhc2UgXCJ4XCI6XG4gICAgICAgIHJldHVybiB0aGlzLmZtdEhleChhcmcpO1xuICAgICAgY2FzZSBcIlhcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10SGV4KGFyZywgdHJ1ZSk7XG4gICAgICBjYXNlIFwiZVwiOlxuICAgICAgICByZXR1cm4gdGhpcy5mbXRGbG9hdEUoYXJnIGFzIG51bWJlcik7XG4gICAgICBjYXNlIFwiRVwiOlxuICAgICAgICByZXR1cm4gdGhpcy5mbXRGbG9hdEUoYXJnIGFzIG51bWJlciwgdHJ1ZSk7XG4gICAgICBjYXNlIFwiZlwiOlxuICAgICAgY2FzZSBcIkZcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10RmxvYXRGKGFyZyBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcImdcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10RmxvYXRHKGFyZyBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcIkdcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10RmxvYXRHKGFyZyBhcyBudW1iZXIsIHRydWUpO1xuICAgICAgY2FzZSBcInNcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10U3RyaW5nKGFyZyBhcyBzdHJpbmcpO1xuICAgICAgY2FzZSBcIlRcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10U3RyaW5nKHR5cGVvZiBhcmcpO1xuICAgICAgY2FzZSBcInZcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10VihhcmcpO1xuICAgICAgY2FzZSBcImpcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10SihhcmcpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGAlIShCQUQgVkVSQiAnJHt0aGlzLnZlcmJ9JylgO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYWQgYSBzdHJpbmdcbiAgICogQHBhcmFtIHMgdGV4dCB0byBwYWRcbiAgICovXG4gIHBhZChzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhZGRpbmcgPSB0aGlzLmZsYWdzLnplcm8gPyBcIjBcIiA6IFwiIFwiO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuZGFzaCkge1xuICAgICAgcmV0dXJuIHMucGFkRW5kKHRoaXMuZmxhZ3Mud2lkdGgsIHBhZGRpbmcpO1xuICAgIH1cblxuICAgIHJldHVybiBzLnBhZFN0YXJ0KHRoaXMuZmxhZ3Mud2lkdGgsIHBhZGRpbmcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhZCBhIG51bWJlclxuICAgKiBAcGFyYW0gblN0clxuICAgKiBAcGFyYW0gbmVnXG4gICAqL1xuICBwYWROdW0oblN0cjogc3RyaW5nLCBuZWc6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgIGxldCBzaWduOiBzdHJpbmc7XG4gICAgaWYgKG5lZykge1xuICAgICAgc2lnbiA9IFwiLVwiO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mbGFncy5wbHVzIHx8IHRoaXMuZmxhZ3Muc3BhY2UpIHtcbiAgICAgIHNpZ24gPSB0aGlzLmZsYWdzLnBsdXMgPyBcIitcIiA6IFwiIFwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaWduID0gXCJcIjtcbiAgICB9XG4gICAgY29uc3QgemVybyA9IHRoaXMuZmxhZ3MuemVybztcbiAgICBpZiAoIXplcm8pIHtcbiAgICAgIC8vIHNpZ24gY29tZXMgaW4gZnJvbnQgb2YgcGFkZGluZyB3aGVuIHBhZGRpbmcgdy8gemVybyxcbiAgICAgIC8vIGluIGZyb20gb2YgdmFsdWUgaWYgcGFkZGluZyB3aXRoIHNwYWNlcy5cbiAgICAgIG5TdHIgPSBzaWduICsgblN0cjtcbiAgICB9XG5cbiAgICBjb25zdCBwYWQgPSB6ZXJvID8gXCIwXCIgOiBcIiBcIjtcbiAgICBjb25zdCBsZW4gPSB6ZXJvID8gdGhpcy5mbGFncy53aWR0aCAtIHNpZ24ubGVuZ3RoIDogdGhpcy5mbGFncy53aWR0aDtcblxuICAgIGlmICh0aGlzLmZsYWdzLmRhc2gpIHtcbiAgICAgIG5TdHIgPSBuU3RyLnBhZEVuZChsZW4sIHBhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5TdHIgPSBuU3RyLnBhZFN0YXJ0KGxlbiwgcGFkKTtcbiAgICB9XG5cbiAgICBpZiAoemVybykge1xuICAgICAgLy8gc2VlIGFib3ZlXG4gICAgICBuU3RyID0gc2lnbiArIG5TdHI7XG4gICAgfVxuICAgIHJldHVybiBuU3RyO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBhIG51bWJlclxuICAgKiBAcGFyYW0gblxuICAgKiBAcGFyYW0gcmFkaXhcbiAgICogQHBhcmFtIHVwY2FzZVxuICAgKi9cbiAgZm10TnVtYmVyKG46IG51bWJlciwgcmFkaXg6IG51bWJlciwgdXBjYXNlID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGxldCBudW0gPSBNYXRoLmFicyhuKS50b1N0cmluZyhyYWRpeCk7XG4gICAgY29uc3QgcHJlYyA9IHRoaXMuZmxhZ3MucHJlY2lzaW9uO1xuICAgIGlmIChwcmVjICE9PSAtMSkge1xuICAgICAgdGhpcy5mbGFncy56ZXJvID0gZmFsc2U7XG4gICAgICBudW0gPSBuID09PSAwICYmIHByZWMgPT09IDAgPyBcIlwiIDogbnVtO1xuICAgICAgd2hpbGUgKG51bS5sZW5ndGggPCBwcmVjKSB7XG4gICAgICAgIG51bSA9IFwiMFwiICsgbnVtO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgcHJlZml4ID0gXCJcIjtcbiAgICBpZiAodGhpcy5mbGFncy5zaGFycCkge1xuICAgICAgc3dpdGNoIChyYWRpeCkge1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJlZml4ICs9IFwiMGJcIjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgIC8vIGRvbid0IGFubm90YXRlIG9jdGFsIDAgd2l0aCAwLi4uXG4gICAgICAgICAgcHJlZml4ICs9IG51bS5zdGFydHNXaXRoKFwiMFwiKSA/IFwiXCIgOiBcIjBcIjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxNjpcbiAgICAgICAgICBwcmVmaXggKz0gXCIweFwiO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhbm5vdCBoYW5kbGUgYmFzZTogXCIgKyByYWRpeCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRvbid0IGFkZCBwcmVmaXggaW4gZnJvbnQgb2YgdmFsdWUgdHJ1bmNhdGVkIGJ5IHByZWNpc2lvbj0wLCB2YWw9MFxuICAgIG51bSA9IG51bS5sZW5ndGggPT09IDAgPyBudW0gOiBwcmVmaXggKyBudW07XG4gICAgaWYgKHVwY2FzZSkge1xuICAgICAgbnVtID0gbnVtLnRvVXBwZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBhZE51bShudW0sIG4gPCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXQgbnVtYmVyIHdpdGggY29kZSBwb2ludHNcbiAgICogQHBhcmFtIG5cbiAgICovXG4gIGZtdE51bWJlckNvZGVQb2ludChuOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGxldCBzID0gXCJcIjtcbiAgICB0cnkge1xuICAgICAgcyA9IFN0cmluZy5mcm9tQ29kZVBvaW50KG4pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcyA9IFVOSUNPREVfUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYWQocyk7XG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IHNwZWNpYWwgZmxvYXRcbiAgICogQHBhcmFtIG5cbiAgICovXG4gIGZtdEZsb2F0U3BlY2lhbChuOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIC8vIGZvcm1hdHRpbmcgb2YgTmFOIGFuZCBJbmYgYXJlIHBhbnRzLW9uLWhlYWRcbiAgICAvLyBzdHVwaWQgYW5kIG1vcmUgb3IgbGVzcyBhcmJpdHJhcnkuXG5cbiAgICBpZiAoaXNOYU4obikpIHtcbiAgICAgIHRoaXMuZmxhZ3MuemVybyA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHRoaXMucGFkTnVtKFwiTmFOXCIsIGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKG4gPT09IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSkge1xuICAgICAgdGhpcy5mbGFncy56ZXJvID0gZmFsc2U7XG4gICAgICB0aGlzLmZsYWdzLnBsdXMgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXMucGFkTnVtKFwiSW5mXCIsIGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKG4gPT09IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSkge1xuICAgICAgdGhpcy5mbGFncy56ZXJvID0gZmFsc2U7XG4gICAgICByZXR1cm4gdGhpcy5wYWROdW0oXCJJbmZcIiwgdHJ1ZSk7XG4gICAgfVxuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLyoqXG4gICAqIFJvdW5kIGZyYWN0aW9uIHRvIHByZWNpc2lvblxuICAgKiBAcGFyYW0gZnJhY3Rpb25hbFxuICAgKiBAcGFyYW0gcHJlY2lzaW9uXG4gICAqL1xuICByb3VuZEZyYWN0aW9uVG9QcmVjaXNpb24oZnJhY3Rpb25hbDogc3RyaW5nLCBwcmVjaXNpb246IG51bWJlcik6IHN0cmluZyB7XG4gICAgaWYgKGZyYWN0aW9uYWwubGVuZ3RoID4gcHJlY2lzaW9uKSB7XG4gICAgICBmcmFjdGlvbmFsID0gXCIxXCIgKyBmcmFjdGlvbmFsOyAvLyBwcmVwZW5kIGEgMSBpbiBjYXNlIG9mIGxlYWRpbmcgMFxuICAgICAgbGV0IHRtcCA9IHBhcnNlSW50KGZyYWN0aW9uYWwuc3Vic3RyKDAsIHByZWNpc2lvbiArIDIpKSAvIDEwO1xuICAgICAgdG1wID0gTWF0aC5yb3VuZCh0bXApO1xuICAgICAgZnJhY3Rpb25hbCA9IE1hdGguZmxvb3IodG1wKS50b1N0cmluZygpO1xuICAgICAgZnJhY3Rpb25hbCA9IGZyYWN0aW9uYWwuc3Vic3RyKDEpOyAvLyByZW1vdmUgZXh0cmEgMVxuICAgIH0gZWxzZSB7XG4gICAgICB3aGlsZSAoZnJhY3Rpb25hbC5sZW5ndGggPCBwcmVjaXNpb24pIHtcbiAgICAgICAgZnJhY3Rpb25hbCArPSBcIjBcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyYWN0aW9uYWw7XG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IGZsb2F0IEVcbiAgICogQHBhcmFtIG5cbiAgICogQHBhcmFtIHVwY2FzZVxuICAgKi9cbiAgZm10RmxvYXRFKG46IG51bWJlciwgdXBjYXNlID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IHNwZWNpYWwgPSB0aGlzLmZtdEZsb2F0U3BlY2lhbChuKTtcbiAgICBpZiAoc3BlY2lhbCAhPT0gXCJcIikge1xuICAgICAgcmV0dXJuIHNwZWNpYWw7XG4gICAgfVxuXG4gICAgY29uc3QgbSA9IG4udG9FeHBvbmVudGlhbCgpLm1hdGNoKEZMT0FUX1JFR0VYUCk7XG4gICAgaWYgKCFtKSB7XG4gICAgICB0aHJvdyBFcnJvcihcImNhbid0IGhhcHBlbiwgYnVnXCIpO1xuICAgIH1cblxuICAgIGxldCBmcmFjdGlvbmFsID0gbVtGLmZyYWN0aW9uYWxdO1xuICAgIGNvbnN0IHByZWNpc2lvbiA9IHRoaXMuZmxhZ3MucHJlY2lzaW9uICE9PSAtMVxuICAgICAgPyB0aGlzLmZsYWdzLnByZWNpc2lvblxuICAgICAgOiBERUZBVUxUX1BSRUNJU0lPTjtcbiAgICBmcmFjdGlvbmFsID0gdGhpcy5yb3VuZEZyYWN0aW9uVG9QcmVjaXNpb24oZnJhY3Rpb25hbCwgcHJlY2lzaW9uKTtcblxuICAgIGxldCBlID0gbVtGLmV4cG9uZW50XTtcbiAgICAvLyBzY2llbnRpZmljIG5vdGF0aW9uIG91dHB1dCB3aXRoIGV4cG9uZW50IHBhZGRlZCB0byBtaW5sZW4gMlxuICAgIGUgPSBlLmxlbmd0aCA9PSAxID8gXCIwXCIgKyBlIDogZTtcblxuICAgIGNvbnN0IHZhbCA9IGAke21bRi5tYW50aXNzYV19LiR7ZnJhY3Rpb25hbH0ke3VwY2FzZSA/IFwiRVwiIDogXCJlXCJ9JHtcbiAgICAgIG1bRi5lc2lnbl1cbiAgICB9JHtlfWA7XG4gICAgcmV0dXJuIHRoaXMucGFkTnVtKHZhbCwgbiA8IDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBmbG9hdCBGXG4gICAqIEBwYXJhbSBuXG4gICAqL1xuICBmbXRGbG9hdEYobjogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBzcGVjaWFsID0gdGhpcy5mbXRGbG9hdFNwZWNpYWwobik7XG4gICAgaWYgKHNwZWNpYWwgIT09IFwiXCIpIHtcbiAgICAgIHJldHVybiBzcGVjaWFsO1xuICAgIH1cblxuICAgIC8vIHN0dXBpZCBoZWxwZXIgdGhhdCB0dXJucyBhIG51bWJlciBpbnRvIGEgKHBvdGVudGlhbGx5KVxuICAgIC8vIFZFUlkgbG9uZyBzdHJpbmcuXG4gICAgZnVuY3Rpb24gZXhwYW5kTnVtYmVyKG46IG51bWJlcik6IHN0cmluZyB7XG4gICAgICBpZiAoTnVtYmVyLmlzU2FmZUludGVnZXIobikpIHtcbiAgICAgICAgcmV0dXJuIG4udG9TdHJpbmcoKSArIFwiLlwiO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0ID0gbi50b0V4cG9uZW50aWFsKCkuc3BsaXQoXCJlXCIpO1xuICAgICAgbGV0IG0gPSB0WzBdLnJlcGxhY2UoXCIuXCIsIFwiXCIpO1xuICAgICAgY29uc3QgZSA9IHBhcnNlSW50KHRbMV0pO1xuICAgICAgaWYgKGUgPCAwKSB7XG4gICAgICAgIGxldCBuU3RyID0gXCIwLlwiO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSAhPT0gTWF0aC5hYnMoZSkgLSAxOyArK2kpIHtcbiAgICAgICAgICBuU3RyICs9IFwiMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoblN0ciArPSBtKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHNwbElkeCA9IGUgKyAxO1xuICAgICAgICB3aGlsZSAobS5sZW5ndGggPCBzcGxJZHgpIHtcbiAgICAgICAgICBtICs9IFwiMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnN1YnN0cigwLCBzcGxJZHgpICsgXCIuXCIgKyBtLnN1YnN0cihzcGxJZHgpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBhdm9pZGluZyBzaWduIG1ha2VzIHBhZGRpbmcgZWFzaWVyXG4gICAgY29uc3QgdmFsID0gZXhwYW5kTnVtYmVyKE1hdGguYWJzKG4pKSBhcyBzdHJpbmc7XG4gICAgY29uc3QgYXJyID0gdmFsLnNwbGl0KFwiLlwiKTtcbiAgICBjb25zdCBkaWcgPSBhcnJbMF07XG4gICAgbGV0IGZyYWN0aW9uYWwgPSBhcnJbMV07XG5cbiAgICBjb25zdCBwcmVjaXNpb24gPSB0aGlzLmZsYWdzLnByZWNpc2lvbiAhPT0gLTFcbiAgICAgID8gdGhpcy5mbGFncy5wcmVjaXNpb25cbiAgICAgIDogREVGQVVMVF9QUkVDSVNJT047XG4gICAgZnJhY3Rpb25hbCA9IHRoaXMucm91bmRGcmFjdGlvblRvUHJlY2lzaW9uKGZyYWN0aW9uYWwsIHByZWNpc2lvbik7XG5cbiAgICByZXR1cm4gdGhpcy5wYWROdW0oYCR7ZGlnfS4ke2ZyYWN0aW9uYWx9YCwgbiA8IDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBmbG9hdCBHXG4gICAqIEBwYXJhbSBuXG4gICAqIEBwYXJhbSB1cGNhc2VcbiAgICovXG4gIGZtdEZsb2F0RyhuOiBudW1iZXIsIHVwY2FzZSA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBjb25zdCBzcGVjaWFsID0gdGhpcy5mbXRGbG9hdFNwZWNpYWwobik7XG4gICAgaWYgKHNwZWNpYWwgIT09IFwiXCIpIHtcbiAgICAgIHJldHVybiBzcGVjaWFsO1xuICAgIH1cblxuICAgIC8vIFRoZSBkb3VibGUgYXJndW1lbnQgcmVwcmVzZW50aW5nIGEgZmxvYXRpbmctcG9pbnQgbnVtYmVyIHNoYWxsIGJlXG4gICAgLy8gY29udmVydGVkIGluIHRoZSBzdHlsZSBmIG9yIGUgKG9yIGluIHRoZSBzdHlsZSBGIG9yIEUgaW5cbiAgICAvLyB0aGUgY2FzZSBvZiBhIEcgY29udmVyc2lvbiBzcGVjaWZpZXIpLCBkZXBlbmRpbmcgb24gdGhlXG4gICAgLy8gdmFsdWUgY29udmVydGVkIGFuZCB0aGUgcHJlY2lzaW9uLiBMZXQgUCBlcXVhbCB0aGVcbiAgICAvLyBwcmVjaXNpb24gaWYgbm9uLXplcm8sIDYgaWYgdGhlIHByZWNpc2lvbiBpcyBvbWl0dGVkLCBvciAxXG4gICAgLy8gaWYgdGhlIHByZWNpc2lvbiBpcyB6ZXJvLiBUaGVuLCBpZiBhIGNvbnZlcnNpb24gd2l0aCBzdHlsZSBFIHdvdWxkXG4gICAgLy8gaGF2ZSBhbiBleHBvbmVudCBvZiBYOlxuXG4gICAgLy8gICAgIC0gSWYgUCA+IFg+PS00LCB0aGUgY29udmVyc2lvbiBzaGFsbCBiZSB3aXRoIHN0eWxlIGYgKG9yIEYgKVxuICAgIC8vICAgICBhbmQgcHJlY2lzaW9uIFAgLSggWCsxKS5cblxuICAgIC8vICAgICAtIE90aGVyd2lzZSwgdGhlIGNvbnZlcnNpb24gc2hhbGwgYmUgd2l0aCBzdHlsZSBlIChvciBFIClcbiAgICAvLyAgICAgYW5kIHByZWNpc2lvbiBQIC0xLlxuXG4gICAgLy8gRmluYWxseSwgdW5sZXNzIHRoZSAnIycgZmxhZyBpcyB1c2VkLCBhbnkgdHJhaWxpbmcgemVyb3Mgc2hhbGwgYmVcbiAgICAvLyByZW1vdmVkIGZyb20gdGhlIGZyYWN0aW9uYWwgcG9ydGlvbiBvZiB0aGUgcmVzdWx0IGFuZCB0aGVcbiAgICAvLyBkZWNpbWFsLXBvaW50IGNoYXJhY3RlciBzaGFsbCBiZSByZW1vdmVkIGlmIHRoZXJlIGlzIG5vXG4gICAgLy8gZnJhY3Rpb25hbCBwb3J0aW9uIHJlbWFpbmluZy5cblxuICAgIC8vIEEgZG91YmxlIGFyZ3VtZW50IHJlcHJlc2VudGluZyBhbiBpbmZpbml0eSBvciBOYU4gc2hhbGwgYmVcbiAgICAvLyBjb252ZXJ0ZWQgaW4gdGhlIHN0eWxlIG9mIGFuIGYgb3IgRiBjb252ZXJzaW9uIHNwZWNpZmllci5cbiAgICAvLyBodHRwczovL3B1YnMub3Blbmdyb3VwLm9yZy9vbmxpbmVwdWJzLzk2OTk5MTk3OTkvZnVuY3Rpb25zL2ZwcmludGYuaHRtbFxuXG4gICAgbGV0IFAgPSB0aGlzLmZsYWdzLnByZWNpc2lvbiAhPT0gLTFcbiAgICAgID8gdGhpcy5mbGFncy5wcmVjaXNpb25cbiAgICAgIDogREVGQVVMVF9QUkVDSVNJT047XG4gICAgUCA9IFAgPT09IDAgPyAxIDogUDtcblxuICAgIGNvbnN0IG0gPSBuLnRvRXhwb25lbnRpYWwoKS5tYXRjaChGTE9BVF9SRUdFWFApO1xuICAgIGlmICghbSkge1xuICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBoYXBwZW5cIik7XG4gICAgfVxuXG4gICAgY29uc3QgWCA9IHBhcnNlSW50KG1bRi5leHBvbmVudF0pICogKG1bRi5lc2lnbl0gPT09IFwiLVwiID8gLTEgOiAxKTtcbiAgICBsZXQgblN0ciA9IFwiXCI7XG4gICAgaWYgKFAgPiBYICYmIFggPj0gLTQpIHtcbiAgICAgIHRoaXMuZmxhZ3MucHJlY2lzaW9uID0gUCAtIChYICsgMSk7XG4gICAgICBuU3RyID0gdGhpcy5mbXRGbG9hdEYobik7XG4gICAgICBpZiAoIXRoaXMuZmxhZ3Muc2hhcnApIHtcbiAgICAgICAgblN0ciA9IG5TdHIucmVwbGFjZSgvXFwuPzAqJC8sIFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZsYWdzLnByZWNpc2lvbiA9IFAgLSAxO1xuICAgICAgblN0ciA9IHRoaXMuZm10RmxvYXRFKG4pO1xuICAgICAgaWYgKCF0aGlzLmZsYWdzLnNoYXJwKSB7XG4gICAgICAgIG5TdHIgPSBuU3RyLnJlcGxhY2UoL1xcLj8wKmUvLCB1cGNhc2UgPyBcIkVcIiA6IFwiZVwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5TdHI7XG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IHN0cmluZ1xuICAgKiBAcGFyYW0gc1xuICAgKi9cbiAgZm10U3RyaW5nKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMuZmxhZ3MucHJlY2lzaW9uICE9PSAtMSkge1xuICAgICAgcyA9IHMuc3Vic3RyKDAsIHRoaXMuZmxhZ3MucHJlY2lzaW9uKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGFkKHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBoZXhcbiAgICogQHBhcmFtIHZhbFxuICAgKiBAcGFyYW0gdXBwZXJcbiAgICovXG4gIGZtdEhleCh2YWw6IHN0cmluZyB8IG51bWJlciwgdXBwZXIgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgLy8gYWxsb3cgb3RoZXJzIHR5cGVzID9cbiAgICBzd2l0Y2ggKHR5cGVvZiB2YWwpIHtcbiAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZm10TnVtYmVyKHZhbCBhcyBudW1iZXIsIDE2LCB1cHBlcik7XG4gICAgICBjYXNlIFwic3RyaW5nXCI6IHtcbiAgICAgICAgY29uc3Qgc2hhcnAgPSB0aGlzLmZsYWdzLnNoYXJwICYmIHZhbC5sZW5ndGggIT09IDA7XG4gICAgICAgIGxldCBoZXggPSBzaGFycCA/IFwiMHhcIiA6IFwiXCI7XG4gICAgICAgIGNvbnN0IHByZWMgPSB0aGlzLmZsYWdzLnByZWNpc2lvbjtcbiAgICAgICAgY29uc3QgZW5kID0gcHJlYyAhPT0gLTEgPyBtaW4ocHJlYywgdmFsLmxlbmd0aCkgOiB2YWwubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSAhPT0gZW5kOyArK2kpIHtcbiAgICAgICAgICBpZiAoaSAhPT0gMCAmJiB0aGlzLmZsYWdzLnNwYWNlKSB7XG4gICAgICAgICAgICBoZXggKz0gc2hhcnAgPyBcIiAweFwiIDogXCIgXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFRPRE8oYmFydGxvbWllanUpOiBmb3Igbm93IG9ubHkgdGFraW5nIGludG8gYWNjb3VudCB0aGVcbiAgICAgICAgICAvLyBsb3dlciBoYWxmIG9mIHRoZSBjb2RlUG9pbnQsIGllLiBhcyBpZiBhIHN0cmluZ1xuICAgICAgICAgIC8vIGlzIGEgbGlzdCBvZiA4Yml0IHZhbHVlcyBpbnN0ZWFkIG9mIFVDUzIgcnVuZXNcbiAgICAgICAgICBjb25zdCBjID0gKHZhbC5jaGFyQ29kZUF0KGkpICYgMHhmZikudG9TdHJpbmcoMTYpO1xuICAgICAgICAgIGhleCArPSBjLmxlbmd0aCA9PT0gMSA/IGAwJHtjfWAgOiBjO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cHBlcikge1xuICAgICAgICAgIGhleCA9IGhleC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnBhZChoZXgpO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiY3VycmVudGx5IG9ubHkgbnVtYmVyIGFuZCBzdHJpbmcgYXJlIGltcGxlbWVudGVkIGZvciBoZXhcIixcbiAgICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IHZhbHVlXG4gICAqIEBwYXJhbSB2YWxcbiAgICovXG4gIGZtdFYodmFsOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMuZmxhZ3Muc2hhcnApIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLmZsYWdzLnByZWNpc2lvbiAhPT0gLTFcbiAgICAgICAgPyB7IGRlcHRoOiB0aGlzLmZsYWdzLnByZWNpc2lvbiB9XG4gICAgICAgIDoge307XG4gICAgICByZXR1cm4gdGhpcy5wYWQoRGVuby5pbnNwZWN0KHZhbCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBwID0gdGhpcy5mbGFncy5wcmVjaXNpb247XG4gICAgICByZXR1cm4gcCA9PT0gLTEgPyB2YWwudG9TdHJpbmcoKSA6IHZhbC50b1N0cmluZygpLnN1YnN0cigwLCBwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IEpTT05cbiAgICogQHBhcmFtIHZhbFxuICAgKi9cbiAgZm10Sih2YWw6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWwpO1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydHMgYW5kIGZvcm1hdCBhIHZhcmlhYmxlIG51bWJlciBvZiBgYXJnc2AgYXMgaXMgc3BlY2lmaWVkIGJ5IGBmb3JtYXRgLlxuICogYHNwcmludGZgIHJldHVybnMgdGhlIGZvcm1hdHRlZCBzdHJpbmcuXG4gKlxuICogQHBhcmFtIGZvcm1hdFxuICogQHBhcmFtIGFyZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNwcmludGYoZm9ybWF0OiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZiA9IG5ldyBQcmludGYoZm9ybWF0LCAuLi5hcmdzKTtcbiAgcmV0dXJuIHByaW50Zi5kb1ByaW50ZigpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGFuZCBmb3JtYXQgYSB2YXJpYWJsZSBudW1iZXIgb2YgYGFyZ3NgIGFzIGlzIHNwZWNpZmllZCBieSBgZm9ybWF0YC5cbiAqIGBwcmludGZgIHdyaXRlcyB0aGUgZm9ybWF0dGVkIHN0cmluZyB0byBzdGFuZGFyZCBvdXRwdXQuXG4gKiBAcGFyYW0gZm9ybWF0XG4gKiBAcGFyYW0gYXJnc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRmKGZvcm1hdDogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHNwcmludGYoZm9ybWF0LCAuLi5hcmdzKTtcbiAgRGVuby5zdGRvdXQud3JpdGVTeW5jKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShzKSk7XG59XG4iXX0=