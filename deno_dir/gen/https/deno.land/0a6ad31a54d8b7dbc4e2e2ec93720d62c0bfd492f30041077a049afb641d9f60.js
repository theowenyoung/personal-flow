import { Adapters } from "./adapter.ts";
import { JSONB } from "./jsonb.ts";
import { MemoryAdapter } from "./memory.ts";
function tryParseURL(q) {
    try {
        return new URL(q);
    }
    catch (e) {
        return;
    }
}
export class Keydb {
    adapter;
    awaitReady;
    namespace = "";
    serialize = JSONB.stringify;
    deserialize = JSONB.parse;
    ttl;
    constructor(adapter = new MemoryAdapter(), options) {
        this.adapter = typeof adapter === "object" ? adapter : undefined;
        if (this.adapter === undefined && typeof adapter !== "object") {
            const proto = tryParseURL(adapter);
            if (!proto)
                throw new Error("Invalid Adapter Connection URI");
            const protocol = proto.protocol;
            const adp = Adapters.get(protocol.substr(0, protocol.length - 1));
            if (!adp)
                throw new Error(`Adapter not found for Protocol: ${protocol}`);
            const res = adp.init(proto);
            if (res instanceof Promise) {
                this.awaitReady = res.then((a) => {
                    this.adapter = a;
                    this.awaitReady = undefined;
                    return a;
                });
            }
            else
                this.adapter = res;
        }
        this.namespace = options?.namespace ?? "";
        if (options?.serialize)
            this.serialize = options.serialize;
        if (options?.deserialize)
            this.deserialize = options.deserialize;
        if (options?.ttl)
            this.ttl = options.ttl;
    }
    async get(key) {
        if (this.awaitReady)
            await this.awaitReady;
        await this.adapter?.deleteExpired(this.namespace);
        const val = await this.adapter?.get(key, this.namespace);
        if (val == undefined)
            return undefined;
        const res = this.deserialize(val.value);
        return res;
    }
    async set(key, value, ttl) {
        if (this.awaitReady)
            await this.awaitReady;
        const _ttl = ttl ?? this.ttl;
        value = {
            value,
            ttl: _ttl && typeof _ttl === "number" ? Date.now() + _ttl : undefined,
        };
        await this.adapter?.set(key, this.serialize(value.value), this.namespace, value.ttl);
        return this;
    }
    async delete(key) {
        if (this.awaitReady)
            await this.awaitReady;
        return (await this.adapter?.delete(key, this.namespace)) ?? false;
    }
    async clear() {
        if (this.awaitReady)
            await this.awaitReady;
        await this.adapter?.clear(this.namespace);
        return this;
    }
    async keys() {
        if (this.awaitReady)
            await this.awaitReady;
        await this.adapter?.deleteExpired(this.namespace);
        const keys = (await this.adapter?.keys(this.namespace)) ?? [];
        return keys;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5ZGIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJrZXlkYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQVc1QyxTQUFTLFdBQVcsQ0FBQyxDQUFTO0lBQzVCLElBQUk7UUFDRixPQUFPLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25CO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPO0tBQ1I7QUFDSCxDQUFDO0FBR0QsTUFBTSxPQUFPLEtBQUs7SUFDaEIsT0FBTyxDQUFXO0lBQ2xCLFVBQVUsQ0FBb0I7SUFDOUIsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUVmLFNBQVMsR0FBdUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztJQUVoRSxXQUFXLEdBQTJCLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDbEQsR0FBRyxDQUFVO0lBRWIsWUFDRSxVQUE0QixJQUFJLGFBQWEsRUFBRSxFQUMvQyxPQUFzQjtRQUV0QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDakUsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7WUFDN0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxLQUFLO2dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztZQUM5RCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQ2hDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENB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Q0FBQztJQUdELEtBQUssQ0FBQyxLQUFLO1FBQ1QsSUFBSSxJQUFJLENBQUMsVUFBVTtZQUFFLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUMzQyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFHRCxLQUFLLENBQUMsSUFBSTtRQUNSLElBQUksSUFBSSxDQUFDLFVBQVU7WUFBRSxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDM0MsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFkYXB0ZXIsIEFkYXB0ZXJzIH0gZnJvbSBcIi4vYWRhcHRlci50c1wiO1xyXG5pbXBvcnQgeyBKU09OQiB9IGZyb20gXCIuL2pzb25iLnRzXCI7XHJcbmltcG9ydCB7IE1lbW9yeUFkYXB0ZXIgfSBmcm9tIFwiLi9tZW1vcnkudHNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgS2V5ZGJPcHRpb25zIHtcclxuICBuYW1lc3BhY2U/OiBzdHJpbmc7XHJcbiAgdHRsPzogbnVtYmVyO1xyXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XHJcbiAgc2VyaWFsaXplPzogKHZhbHVlOiBhbnkpID0+IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxyXG4gIGRlc2VyaWFsaXplPzogKHZhbHVlOiBzdHJpbmcpID0+IGFueTtcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5UGFyc2VVUkwocTogc3RyaW5nKSB7XHJcbiAgdHJ5IHtcclxuICAgIHJldHVybiBuZXcgVVJMKHEpO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbn1cclxuXHJcbi8qKiBTaW1wbGUgYW5kIGNvbW1vbiBLZXktdmFsdWUgc3RvcmFnZSBpbnRlcmZhY2UgZm9yIG11bHRpcGxlIERhdGFiYXNlIGJhY2tlbmRzLiAqL1xyXG5leHBvcnQgY2xhc3MgS2V5ZGIge1xyXG4gIGFkYXB0ZXI/OiBBZGFwdGVyO1xyXG4gIGF3YWl0UmVhZHk/OiBQcm9taXNlPEFkYXB0ZXI+O1xyXG4gIG5hbWVzcGFjZSA9IFwiXCI7XHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBzZXJpYWxpemU6ICh2YWx1ZTogYW55KSA9PiBzdHJpbmcgfCB1bmRlZmluZWQgPSBKU09OQi5zdHJpbmdpZnk7XHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBkZXNlcmlhbGl6ZTogKHZhbHVlOiBzdHJpbmcpID0+IGFueSA9IEpTT05CLnBhcnNlO1xyXG4gIHR0bD86IG51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhZGFwdGVyOiBBZGFwdGVyIHwgc3RyaW5nID0gbmV3IE1lbW9yeUFkYXB0ZXIoKSxcclxuICAgIG9wdGlvbnM/OiBLZXlkYk9wdGlvbnNcclxuICApIHtcclxuICAgIHRoaXMuYWRhcHRlciA9IHR5cGVvZiBhZGFwdGVyID09PSBcIm9iamVjdFwiID8gYWRhcHRlciA6IHVuZGVmaW5lZDtcclxuICAgIGlmICh0aGlzLmFkYXB0ZXIgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgYWRhcHRlciAhPT0gXCJvYmplY3RcIikge1xyXG4gICAgICBjb25zdCBwcm90byA9IHRyeVBhcnNlVVJMKGFkYXB0ZXIpO1xyXG4gICAgICBpZiAoIXByb3RvKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEFkYXB0ZXIgQ29ubmVjdGlvbiBVUklcIik7XHJcbiAgICAgIGNvbnN0IHByb3RvY29sID0gcHJvdG8ucHJvdG9jb2w7XHJcbiAgICAgIGNvbnN0IGFkcCA9IEFkYXB0ZXJzLmdldChwcm90b2NvbC5zdWJzdHIoMCwgcHJvdG9jb2wubGVuZ3RoIC0gMSkpO1xyXG4gICAgICBpZiAoIWFkcCkgdGhyb3cgbmV3IEVycm9yKGBBZGFwdGVyIG5vdCBmb3VuZCBmb3IgUHJvdG9jb2w6ICR7cHJvdG9jb2x9YCk7XHJcbiAgICAgIGNvbnN0IHJlcyA9IGFkcC5pbml0KHByb3RvKTtcclxuICAgICAgaWYgKHJlcyBpbnN0YW5jZW9mIFByb21pc2UpIHtcclxuICAgICAgICB0aGlzLmF3YWl0UmVhZHkgPSByZXMudGhlbigoYSkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5hZGFwdGVyID0gYTtcclxuICAgICAgICAgIHRoaXMuYXdhaXRSZWFkeSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2UgdGhpcy5hZGFwdGVyID0gcmVzO1xyXG4gICAgfVxyXG4gICAgdGhpcy5uYW1lc3BhY2UgPSBvcHRpb25zPy5uYW1lc3BhY2UgPz8gXCJcIjtcclxuICAgIGlmIChvcHRpb25zPy5zZXJpYWxpemUpIHRoaXMuc2VyaWFsaXplID0gb3B0aW9ucy5zZXJpYWxpemU7XHJcbiAgICBpZiAob3B0aW9ucz8uZGVzZXJpYWxpemUpIHRoaXMuZGVzZXJpYWxpemUgPSBvcHRpb25zLmRlc2VyaWFsaXplO1xyXG4gICAgaWYgKG9wdGlvbnM/LnR0bCkgdGhpcy50dGwgPSBvcHRpb25zLnR0bDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhIFZhbHVlIGJ5IEtleSBuYW1lLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGtleSBOYW1lIG9mIEtleSB0byBnZXQgVmFsdWUuXHJcbiAgICovXHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBhc3luYyBnZXQ8VCA9IGFueT4oa2V5OiBzdHJpbmcpOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcclxuICAgIGlmICh0aGlzLmF3YWl0UmVhZHkpIGF3YWl0IHRoaXMuYXdhaXRSZWFkeTtcclxuICAgIGF3YWl0IHRoaXMuYWRhcHRlcj8uZGVsZXRlRXhwaXJlZCh0aGlzLm5hbWVzcGFjZSk7XHJcbiAgICBjb25zdCB2YWwgPSBhd2FpdCB0aGlzLmFkYXB0ZXI/LmdldChrZXksIHRoaXMubmFtZXNwYWNlKTtcclxuICAgIGlmICh2YWwgPT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgY29uc3QgcmVzID0gdGhpcy5kZXNlcmlhbGl6ZSh2YWwudmFsdWUpO1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCBhIEtleSdzIFZhbHVlLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGtleSBOYW1lIG9mIHRoZSBLZXkgdG8gc2V0LlxyXG4gICAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byBzZXQuXHJcbiAgICovXHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBhc3luYyBzZXQoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnksIHR0bD86IG51bWJlcik6IFByb21pc2U8dGhpcz4ge1xyXG4gICAgaWYgKHRoaXMuYXdhaXRSZWFkeSkgYXdhaXQgdGhpcy5hd2FpdFJlYWR5O1xyXG4gICAgY29uc3QgX3R0bCA9IHR0bCA/PyB0aGlzLnR0bDtcclxuICAgIHZhbHVlID0ge1xyXG4gICAgICB2YWx1ZSxcclxuICAgICAgdHRsOiBfdHRsICYmIHR5cGVvZiBfdHRsID09PSBcIm51bWJlclwiID8gRGF0ZS5ub3coKSArIF90dGwgOiB1bmRlZmluZWQsXHJcbiAgICB9O1xyXG4gICAgYXdhaXQgdGhpcy5hZGFwdGVyPy5zZXQoXHJcbiAgICAgIGtleSxcclxuICAgICAgdGhpcy5zZXJpYWxpemUodmFsdWUudmFsdWUpLFxyXG4gICAgICB0aGlzLm5hbWVzcGFjZSxcclxuICAgICAgdmFsdWUudHRsXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZWxldGUgYSBLZXkgZnJvbSBEYXRhYmFzZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBrZXkgTmFtZSBvZiB0aGUgS2V5IHRvIGRlbGV0ZS5cclxuICAgKi9cclxuICBhc3luYyBkZWxldGUoa2V5OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGlmICh0aGlzLmF3YWl0UmVhZHkpIGF3YWl0IHRoaXMuYXdhaXRSZWFkeTtcclxuICAgIHJldHVybiAoYXdhaXQgdGhpcy5hZGFwdGVyPy5kZWxldGUoa2V5LCB0aGlzLm5hbWVzcGFjZSkpID8/IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqIENsZWFyIGNvbXBsZXRlIERhdGFiYXNlLiAqL1xyXG4gIGFzeW5jIGNsZWFyKCk6IFByb21pc2U8dGhpcz4ge1xyXG4gICAgaWYgKHRoaXMuYXdhaXRSZWFkeSkgYXdhaXQgdGhpcy5hd2FpdFJlYWR5O1xyXG4gICAgYXdhaXQgdGhpcy5hZGFwdGVyPy5jbGVhcih0aGlzLm5hbWVzcGFjZSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8qKiBHZXQgYW4gQXJyYXkgb2YgYWxsIEtleSBOYW1lcy4gKi9cclxuICBhc3luYyBrZXlzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuICAgIGlmICh0aGlzLmF3YWl0UmVhZHkpIGF3YWl0IHRoaXMuYXdhaXRSZWFkeTtcclxuICAgIGF3YWl0IHRoaXMuYWRhcHRlcj8uZGVsZXRlRXhwaXJlZCh0aGlzLm5hbWVzcGFjZSk7XHJcbiAgICBjb25zdCBrZXlzID0gKGF3YWl0IHRoaXMuYWRhcHRlcj8ua2V5cyh0aGlzLm5hbWVzcGFjZSkpID8/IFtdO1xyXG4gICAgcmV0dXJuIGtleXM7XHJcbiAgfVxyXG59XHJcbiJdfQ==