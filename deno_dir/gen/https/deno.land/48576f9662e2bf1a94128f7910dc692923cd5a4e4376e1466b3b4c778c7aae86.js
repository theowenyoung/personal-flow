import { getStr } from "./wasm.ts";
import { Status, Types, Values } from "./constants.ts";
import SqliteError from "./error.ts";
import { RowObjects } from "./row_objects.ts";
export class Rows {
    _db;
    _stmt;
    _done;
    constructor(db, stmt) {
        this._db = db;
        this._stmt = stmt;
        this._done = false;
        if (!this._db) {
            this._done = true;
        }
    }
    return() {
        if (this._done) {
            return { done: true, value: undefined };
        }
        this._db._wasm.finalize(this._stmt);
        this._db._transactions.delete(this);
        this._done = true;
        return { done: true, value: undefined };
    }
    done() {
        this.return();
    }
    next() {
        if (this._done)
            return { value: undefined, done: true };
        const row = this._get();
        const status = this._db._wasm.step(this._stmt);
        switch (status) {
            case Status.SqliteRow:
                break;
            case Status.SqliteDone:
                this.return();
                break;
            default:
                this.return();
                throw this._db._error(status);
                break;
        }
        return { value: row, done: false };
    }
    columns() {
        if (this._done) {
            throw new SqliteError("Unable to retrieve column names as transaction is finalized.");
        }
        const columnCount = this._db._wasm.column_count(this._stmt);
        const columns = [];
        for (let i = 0; i < columnCount; i++) {
            const name = getStr(this._db._wasm, this._db._wasm.column_name(this._stmt, i));
            const originName = getStr(this._db._wasm, this._db._wasm.column_origin_name(this._stmt, i));
            const tableName = getStr(this._db._wasm, this._db._wasm.column_table_name(this._stmt, i));
            columns.push({ name, originName, tableName });
        }
        return columns;
    }
    asObjects() {
        return new RowObjects(this);
    }
    [Symbol.iterator]() {
        return this;
    }
    _get() {
        const row = [];
        for (let i = 0, c = this._db._wasm.column_count(this._stmt); i < c; i++) {
            switch (this._db._wasm.column_type(this._stmt, i)) {
                case Types.Integer:
                    row.push(this._db._wasm.column_int(this._stmt, i));
                    break;
                case Types.Float:
                    row.push(this._db._wasm.column_double(this._stmt, i));
                    break;
                case Types.Text:
                    row.push(getStr(this._db._wasm, this._db._wasm.column_text(this._stmt, i)));
                    break;
                case Types.Blob: {
                    const ptr = this._db._wasm.column_blob(this._stmt, i);
                    if (ptr === 0) {
                        row.push(null);
                    }
                    else {
                        const length = this._db._wasm.column_bytes(this._stmt, i);
                        row.push(new Uint8Array(this._db._wasm.memory.buffer, ptr, length).slice());
                    }
                    break;
                }
                case Types.BigInteger: {
                    const ptr = this._db._wasm.column_text(this._stmt, i);
                    row.push(BigInt(getStr(this._db._wasm, ptr)));
                    break;
                }
                default:
                    row.push(null);
                    break;
            }
        }
        return row;
    }
}
export const Empty = new Rows(null, Values.Null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm93cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJvd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2RCxPQUFPLFdBQVcsTUFBTSxZQUFZLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBUTlDLE1BQU0sT0FBTyxJQUFJO0lBQ1AsR0FBRyxDQUFNO0lBQ1QsS0FBSyxDQUFTO0lBQ2QsS0FBSyxDQUFVO0lBYXZCLFlBQVksRUFBTyxFQUFFLElBQVk7UUFDL0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUVuQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNiLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1NBQ25CO0lBQ0gsQ0FBQztJQVNELE1BQU07UUFDSixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDZCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7U0FDekM7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7SUFDMUMsQ0FBQztJ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S0FBSyxFQUFFLENBQ2xFLENBQUM7cUJBQ0g7b0JBQ0QsTUFBTTtpQkFDUDtnQkFDRCxLQUFLLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3RELEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLE1BQU07aUJBQ1A7Z0JBQ0Q7b0JBRUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDZixNQUFNO2FBQ1Q7U0FDRjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUNGO0FBWUQsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXRTdHIgfSBmcm9tIFwiLi93YXNtLnRzXCI7XG5pbXBvcnQgeyBTdGF0dXMsIFR5cGVzLCBWYWx1ZXMgfSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcbmltcG9ydCBTcWxpdGVFcnJvciBmcm9tIFwiLi9lcnJvci50c1wiO1xuaW1wb3J0IHsgUm93T2JqZWN0cyB9IGZyb20gXCIuL3Jvd19vYmplY3RzLnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29sdW1uTmFtZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgb3JpZ2luTmFtZTogc3RyaW5nO1xuICB0YWJsZU5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFJvd3Mge1xuICBwcml2YXRlIF9kYjogYW55O1xuICBwcml2YXRlIF9zdG10OiBudW1iZXI7XG4gIHByaXZhdGUgX2RvbmU6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFJvd3NcbiAgICpcbiAgICogUm93cyByZXByZXNlbnQgYSBzZXQgb2YgcmVzdWx0cyBmcm9tIGEgcXVlcnkuXG4gICAqIFRoZXkgYXJlIGl0ZXJhYmxlIGFuZCB5aWVsZCBhcnJheXMgd2l0aFxuICAgKiB0aGUgZGF0YSBmcm9tIHRoZSBzZWxlY3RlZCBjb2x1bW5zLlxuICAgKlxuICAgKiBUaGlzIGNsYXNzIGlzIG5vdCBleHBvcnRlZCBmcm9tIHRoZSBtb2R1bGVcbiAgICogYW5kIHRoZSBvbmx5IGNvcnJlY3Qgd2F5IHRvIG9idGFpbiBhIGBSb3dzYFxuICAgKiBvYmplY3QgaXMgYnkgbWFraW5nIGEgZGF0YWJhc2UgcXVlcnkuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihkYjogYW55LCBzdG10OiBudW1iZXIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMuX3N0bXQgPSBzdG10O1xuICAgIHRoaXMuX2RvbmUgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5fZGIpIHtcbiAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSb3dzLnJldHVyblxuICAgKlxuICAgKiBJbXBsZW1lbnRzIHRoZSBjbG9zaW5nIGl0ZXJhdG9yXG4gICAqIHByb3RvY29sLiBTZWUgYWxzbzpcbiAgICogaHR0cHM6Ly9leHBsb3Jpbmdqcy5jb20vZXM2L2NoX2l0ZXJhdGlvbi5odG1sI3NlY19jbG9zaW5nLWl0ZXJhdG9yc1xuICAgKi9cbiAgcmV0dXJuKCk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgIGlmICh0aGlzLl9kb25lKSB7XG4gICAgICByZXR1cm4geyBkb25lOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfVxuICAgIC8vIFJlbGVhc2UgdHJhbnNhY3Rpb24gc2xvdFxuICAgIHRoaXMuX2RiLl93YXNtLmZpbmFsaXplKHRoaXMuX3N0bXQpO1xuICAgIHRoaXMuX2RiLl90cmFuc2FjdGlvbnMuZGVsZXRlKHRoaXMpO1xuICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgIHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSb3dzLmRvbmVcbiAgICpcbiAgICogRGVwcmVjYXRlZCwgcHJlZmVyIGBSb3dzLnJldHVybmAuXG4gICAqL1xuICBkb25lKCkge1xuICAgIHRoaXMucmV0dXJuKCk7XG4gIH1cblxuICAvKipcbiAgICogUm93cy5uZXh0XG4gICAqXG4gICAqIEltcGxlbWVudHMgdGhlIGl0ZXJhdG9yIHByb3RvY29sLlxuICAgKi9cbiAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxhbnlbXT4ge1xuICAgIGlmICh0aGlzLl9kb25lKSByZXR1cm4geyB2YWx1ZTogdW5kZWZpbmVkLCBkb25lOiB0cnVlIH07XG4gICAgLy8gTG9hZCByb3cgZGF0YSBhbmQgYWR2YW5jZSBzdGF0ZW1lbnRcbiAgICBjb25zdCByb3cgPSB0aGlzLl9nZXQoKTtcbiAgICBjb25zdCBzdGF0dXMgPSB0aGlzLl9kYi5fd2FzbS5zdGVwKHRoaXMuX3N0bXQpO1xuICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICBjYXNlIFN0YXR1cy5TcWxpdGVSb3c6XG4gICAgICAgIC8vIE5PIE9QXG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBTdGF0dXMuU3FsaXRlRG9uZTpcbiAgICAgICAgdGhpcy5yZXR1cm4oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJldHVybigpO1xuICAgICAgICB0aHJvdyB0aGlzLl9kYi5fZXJyb3Ioc3RhdHVzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB7IHZhbHVlOiByb3csIGRvbmU6IGZhbHNlIH07XG4gIH1cblxuICAvKipcbiAgICogUm93cy5jb2x1bW5zXG4gICAqXG4gICAqIENhbGwgdGhpcyBpZiB5b3UgbmVlZCBjb2x1bW4gbmFtZXMgZnJvbSB0aGUgcmVzdWx0IG9mIGEgc2VsZWN0IHF1ZXJ5LlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMsIHdoZXJlIGVhY2ggb2JqZWN0IGhhcyB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqIHwgUHJvcGVydHkgICAgIHwgVmFsdWUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbiAgICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICAgKiB8IGBuYW1lYCAgICAgICB8IHRoZSByZXN1bHQgb2YgYHNxbGl0ZTNfY29sdW1uX25hbWVgICAgICAgICB8XG4gICAqIHwgYG9yaWdpbk5hbWVgIHwgdGhlIHJlc3VsdCBvZiBgc3FsaXRlM19jb2x1bW5fb3JpZ2luX25hbWVgIHxcbiAgICogfCBgdGFibGVOYW1lYCAgfCB0aGUgcmVzdWx0IG9mIGBzcWxpdGUzX2NvbHVtbl90YWJsZV9uYW1lYCAgfFxuICAgKi9cbiAgY29sdW1ucygpOiBDb2x1bW5OYW1lW10ge1xuICAgIGlmICh0aGlzLl9kb25lKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXG4gICAgICAgIFwiVW5hYmxlIHRvIHJldHJpZXZlIGNvbHVtbiBuYW1lcyBhcyB0cmFuc2FjdGlvbiBpcyBmaW5hbGl6ZWQuXCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbHVtbkNvdW50ID0gdGhpcy5fZGIuX3dhc20uY29sdW1uX2NvdW50KHRoaXMuX3N0bXQpO1xuICAgIGNvbnN0IGNvbHVtbnM6IENvbHVtbk5hbWVbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29sdW1uQ291bnQ7IGkrKykge1xuICAgICAgY29uc3QgbmFtZSA9IGdldFN0cihcbiAgICAgICAgdGhpcy5fZGIuX3dhc20sXG4gICAgICAgIHRoaXMuX2RiLl93YXNtLmNvbHVtbl9uYW1lKHRoaXMuX3N0bXQsIGkpLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IG9yaWdpbk5hbWUgPSBnZXRTdHIoXG4gICAgICAgIHRoaXMuX2RiLl93YXNtLFxuICAgICAgICB0aGlzLl9kYi5fd2FzbS5jb2x1bW5fb3JpZ2luX25hbWUodGhpcy5fc3RtdCwgaSksXG4gICAgICApO1xuICAgICAgY29uc3QgdGFibGVOYW1lID0gZ2V0U3RyKFxuICAgICAgICB0aGlzLl9kYi5fd2FzbSxcbiAgICAgICAgdGhpcy5fZGIuX3dhc20uY29sdW1uX3RhYmxlX25hbWUodGhpcy5fc3RtdCwgaSksXG4gICAgICApO1xuICAgICAgY29sdW1ucy5wdXNoKHsgbmFtZSwgb3JpZ2luTmFtZSwgdGFibGVOYW1lIH0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sdW1ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBSb3dzLmFzT2JqZWN0c1xuICAgKiBcbiAgICogQ2FsbCB0aGlzIGlmIHlvdSBuZWVkIHRvIG91cHV0IHRoZSByb3dzIGFzIG9iamVjdHMuXG4gICAqIFxuICAgKiAgICAgY29uc3Qgcm93cyA9IFsuLi5kYi5xdWVyeShcIlNFTEVDVCBuYW1lIEZST00gdXNlcnM7XCIpLmFzT2JqZWN0cygpXTtcbiAgICovXG4gIGFzT2JqZWN0czxUIGV4dGVuZHMgYW55ID0gUmVjb3JkPHN0cmluZywgYW55Pj4oKTogUm93T2JqZWN0czxUPiB7XG4gICAgcmV0dXJuIG5ldyBSb3dPYmplY3RzPFQ+KHRoaXMpO1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwcml2YXRlIF9nZXQoKTogYW55W10ge1xuICAgIC8vIEdldCByZXN1bHRzIGZyb20gcm93XG4gICAgY29uc3Qgcm93ID0gW107XG4gICAgLy8gcmV0dXJuIHJvdztcbiAgICBmb3IgKFxuICAgICAgbGV0IGkgPSAwLCBjID0gdGhpcy5fZGIuX3dhc20uY29sdW1uX2NvdW50KHRoaXMuX3N0bXQpO1xuICAgICAgaSA8IGM7XG4gICAgICBpKytcbiAgICApIHtcbiAgICAgIHN3aXRjaCAodGhpcy5fZGIuX3dhc20uY29sdW1uX3R5cGUodGhpcy5fc3RtdCwgaSkpIHtcbiAgICAgICAgY2FzZSBUeXBlcy5JbnRlZ2VyOlxuICAgICAgICAgIHJvdy5wdXNoKHRoaXMuX2RiLl93YXNtLmNvbHVtbl9pbnQodGhpcy5fc3RtdCwgaSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFR5cGVzLkZsb2F0OlxuICAgICAgICAgIHJvdy5wdXNoKHRoaXMuX2RiLl93YXNtLmNvbHVtbl9kb3VibGUodGhpcy5fc3RtdCwgaSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFR5cGVzLlRleHQ6XG4gICAgICAgICAgcm93LnB1c2goXG4gICAgICAgICAgICBnZXRTdHIoXG4gICAgICAgICAgICAgIHRoaXMuX2RiLl93YXNtLFxuICAgICAgICAgICAgICB0aGlzLl9kYi5fd2FzbS5jb2x1bW5fdGV4dCh0aGlzLl9zdG10LCBpKSxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBUeXBlcy5CbG9iOiB7XG4gICAgICAgICAgY29uc3QgcHRyID0gdGhpcy5fZGIuX3dhc20uY29sdW1uX2Jsb2IodGhpcy5fc3RtdCwgaSk7XG4gICAgICAgICAgaWYgKHB0ciA9PT0gMCkge1xuICAgICAgICAgICAgLy8gWmVybyBwb2ludGVyIHJlc3VsdHMgaW4gbnVsbFxuICAgICAgICAgICAgcm93LnB1c2gobnVsbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMuX2RiLl93YXNtLmNvbHVtbl9ieXRlcyh0aGlzLl9zdG10LCBpKTtcbiAgICAgICAgICAgIC8vIFNsaWNlIHNob3VsZCBjb3B5IHRoZSBieXRlcywgYXMgaXQgbWFrZXMgYSBzaGFsbG93IGNvcHlcbiAgICAgICAgICAgIHJvdy5wdXNoKFxuICAgICAgICAgICAgICBuZXcgVWludDhBcnJheSh0aGlzLl9kYi5fd2FzbS5tZW1vcnkuYnVmZmVyLCBwdHIsIGxlbmd0aCkuc2xpY2UoKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZXMuQmlnSW50ZWdlcjoge1xuICAgICAgICAgIGNvbnN0IHB0ciA9IHRoaXMuX2RiLl93YXNtLmNvbHVtbl90ZXh0KHRoaXMuX3N0bXQsIGkpO1xuICAgICAgICAgIHJvdy5wdXNoKEJpZ0ludChnZXRTdHIodGhpcy5fZGIuX3dhc20sIHB0cikpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIC8vIFRPRE86IERpZmZlcmVudGlhdGUgYmV0d2VlbiBOVUxMIGFuZCBub3QtcmVjb2duaXplZD9cbiAgICAgICAgICByb3cucHVzaChudWxsKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdztcbiAgfVxufVxuXG4vKipcbiAqIEVtcHR5XG4gKlxuICogQSBzcGVjaWFsIGNvbnN0YW50LiBUaGlzIGlzIGEgYFJvd3NgIG9iamVjdFxuICogd2hpY2ggaGFzIG5vIHJlc3VsdHMuIEl0IGlzIHN0aWxsIGl0ZXJhYmxlLFxuICogaG93ZXZlciBpdCB3b24ndCB5aWVsZCBhbnkgcmVzdWx0cy5cbiAqXG4gKiBgRW1wdHlgIGlzIHJldHVybmVkIGZyb20gcXVlcmllcyB3aGljaCByZXR1cm5cbiAqIG5vIGRhdGEuXG4gKi9cbmV4cG9ydCBjb25zdCBFbXB0eSA9IG5ldyBSb3dzKG51bGwsIFZhbHVlcy5OdWxsKTtcbiJdfQ==