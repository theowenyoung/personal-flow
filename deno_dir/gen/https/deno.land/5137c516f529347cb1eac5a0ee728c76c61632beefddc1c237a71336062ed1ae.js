var Type;
(function (Type) {
    Type[Type["NO_DEPENDENCY"] = 0] = "NO_DEPENDENCY";
    Type[Type["PREVIOUS_COMMAND_MUST_SUCCEED"] = 1] = "PREVIOUS_COMMAND_MUST_SUCCEED";
    Type[Type["PREVIOUS_COMMAND_MUST_FAIL"] = 2] = "PREVIOUS_COMMAND_MUST_FAIL";
})(Type || (Type = {}));
class CmdError extends Error {
    message;
    code;
    constructor(code, message) {
        super(message);
        this.message = message;
        this.code = code;
    }
}
function getCommandParams(command) {
    const myRegexp = /[^\s"]+|"([^"]*)"/gi;
    const splits = [];
    let match;
    do {
        match = myRegexp.exec(command);
        if (match != null) {
            splits.push(match[1] ? match[1] : match[0]);
        }
    } while (match != null);
    return splits;
}
export function setCmdOkResult(ctx, cmdResult) {
    ctx.public.cmdResult = cmdResult;
    ctx.public.cmdOk = true;
    ctx.public.cmdError = undefined;
    ctx.public.cmdCode = 0;
    return ctx;
}
export function setCmdErrorResult(ctx, error, code) {
    ctx.public.cmdResult = undefined;
    ctx.public.cmdOk = false;
    ctx.public.cmdError = error;
    ctx.public.cmdCode = code;
    return ctx;
}
function splitCommand(command) {
    const commands = [];
    let currentAppendingCommandIndex = 0;
    let stringStartIndexOfCurrentCommand = 0;
    let currentCommandType = Type.NO_DEPENDENCY;
    for (let i = 0; i < command.length; i++) {
        if (i === command.length - 1) {
            commands[currentAppendingCommandIndex] = {
                command: command.slice(stringStartIndexOfCurrentCommand).trim(),
                type: currentCommandType,
                muted: false,
            };
        }
        if (command[i] === "&") {
            if (command[i + 1] && command[i + 1] === "&") {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1)
                        .trim(),
                    type: currentCommandType,
                    muted: false,
                };
                currentCommandType = Type.PREVIOUS_COMMAND_MUST_SUCCEED;
            }
            else {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1)
                        .trim(),
                    type: currentCommandType,
                    muted: true,
                };
            }
            i += 2;
            stringStartIndexOfCurrentCommand = i;
            currentAppendingCommandIndex++;
        }
        if (command[i] === "|") {
            if (command[i + 1] && command[i + 1] === "|") {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1)
                        .trim(),
                    type: currentCommandType,
                    muted: false,
                };
                currentCommandType = Type.PREVIOUS_COMMAND_MUST_FAIL;
                i += 2;
                stringStartIndexOfCurrentCommand = i;
                currentAppendingCommandIndex++;
            }
        }
    }
    return commands;
}
export const runCmd = async (_ctx, command, options = { verbose: false }) => {
    const commands = splitCommand(command);
    let output = "";
    let lastRunFailed = false;
    for (const individualCommand of commands) {
        if (individualCommand.type === Type.PREVIOUS_COMMAND_MUST_SUCCEED &&
            lastRunFailed) {
            if (options.verbose) {
                console.log(`Skipped command ' ${individualCommand.command}' because last process did fail`);
            }
            lastRunFailed = true;
            continue;
        }
        if (individualCommand.type === Type.PREVIOUS_COMMAND_MUST_FAIL &&
            !lastRunFailed) {
            if (options.verbose) {
                console.log(`Skipped command '${individualCommand.command}' because last process didn't fail`);
            }
            lastRunFailed = true;
            continue;
        }
        if (options.verbose) {
            console.log(`Executing command '${individualCommand.command}'`);
        }
        const commandParameters = getCommandParams(individualCommand.command);
        const process = Deno.run({
            cmd: commandParameters,
            stdout: "piped",
            stderr: "piped",
        });
        let response = "";
        let stderr = "";
        const decoder = new TextDecoder();
        const buff = new Uint8Array(1);
        while (true) {
            try {
                const result = await process.stdout?.read(buff);
                if (!result) {
                    break;
                }
                response = response + decoder.decode(buff);
                await Deno.stdout.write(buff);
            }
            catch (_) {
                break;
            }
        }
        const errorBuff = new Uint8Array(1);
        while (true) {
            try {
                const result = await process.stderr?.read(errorBuff);
                if (!result) {
                    break;
                }
                stderr = stderr + decoder.decode(errorBuff);
                await Deno.stdout.write(errorBuff);
            }
            catch (_) {
                break;
            }
        }
        const status = await process.status();
        process.stdout?.close();
        process.stderr?.close();
        process.close();
        if (!individualCommand.muted && !status.success) {
            if (options.verbose) {
                console.log(`Process of command '${individualCommand.command}' threw an error`);
            }
            if (!options.continueOnError) {
                const error = new CmdError(status.code, stderr);
                throw error;
            }
            else {
                lastRunFailed = true;
            }
        }
        else {
            lastRunFailed = false;
        }
        output += response;
    }
    const finalStdout = output.replace(/\n$/, "");
    return {
        code: 0,
        stdout: finalStdout,
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLWNtZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bi1jbWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsSUFBSyxJQUlKO0FBSkQsV0FBSyxJQUFJO0lBQ1AsaURBQWEsQ0FBQTtJQUNiLGlGQUE2QixDQUFBO0lBQzdCLDJFQUEwQixDQUFBO0FBQzVCLENBQUMsRUFKSSxJQUFJLEtBQUosSUFBSSxRQUlSO0FBQ0QsTUFBTSxRQUFTLFNBQVEsS0FBSztJQUVPO0lBRDFCLElBQUksQ0FBUztJQUNwQixZQUFZLElBQVksRUFBUyxPQUFlO1FBQzlDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQURnQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBRTlDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQUNELFNBQVMsZ0JBQWdCLENBQUMsT0FBZTtJQUN2QyxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQztJQUN2QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDbEIsSUFBSSxLQUFLLENBQUM7SUFDVixHQUFHO1FBRUQsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1lBR2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzdDO0tBQ0YsUUFBUSxLQUFLLElBQUksSUFBSSxFQUFFO0lBRXhCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFDRCxNQUFNLFVBQVUsY0FBYyxDQUFDLEdBQVksRUFBRSxTQUFpQjtJQUM1RCxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDakMsR0FBRyxDQUFDLE1BQU0s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dCB7IENvbnRleHQgfSBmcm9tIFwiLi9pbnRlcm5hbC1pbnRlcmZhY2UudHNcIjtcbmVudW0gVHlwZSB7XG4gIE5PX0RFUEVOREVOQ1ksXG4gIFBSRVZJT1VTX0NPTU1BTkRfTVVTVF9TVUNDRUVELFxuICBQUkVWSU9VU19DT01NQU5EX01VU1RfRkFJTCxcbn1cbmNsYXNzIENtZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgY29kZTogbnVtYmVyO1xuICBjb25zdHJ1Y3Rvcihjb2RlOiBudW1iZXIsIHB1YmxpYyBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLmNvZGUgPSBjb2RlO1xuICB9XG59XG5mdW5jdGlvbiBnZXRDb21tYW5kUGFyYW1zKGNvbW1hbmQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgbXlSZWdleHAgPSAvW15cXHNcIl0rfFwiKFteXCJdKilcIi9naTtcbiAgY29uc3Qgc3BsaXRzID0gW107XG4gIGxldCBtYXRjaDtcbiAgZG8ge1xuICAgIC8vRWFjaCBjYWxsIHRvIGV4ZWMgcmV0dXJucyB0aGUgbmV4dCByZWdleCBtYXRjaCBhcyBhbiBhcnJheVxuICAgIG1hdGNoID0gbXlSZWdleHAuZXhlYyhjb21tYW5kKTtcbiAgICBpZiAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgLy9JbmRleCAxIGluIHRoZSBhcnJheSBpcyB0aGUgY2FwdHVyZWQgZ3JvdXAgaWYgaXQgZXhpc3RzXG4gICAgICAvL0luZGV4IDAgaXMgdGhlIG1hdGNoZWQgdGV4dCwgd2hpY2ggd2UgdXNlIGlmIG5vIGNhcHR1cmVkIGdyb3VwIGV4aXN0c1xuICAgICAgc3BsaXRzLnB1c2gobWF0Y2hbMV0gPyBtYXRjaFsxXSA6IG1hdGNoWzBdKTtcbiAgICB9XG4gIH0gd2hpbGUgKG1hdGNoICE9IG51bGwpO1xuXG4gIHJldHVybiBzcGxpdHM7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0Q21kT2tSZXN1bHQoY3R4OiBDb250ZXh0LCBjbWRSZXN1bHQ6IHN0cmluZyk6IENvbnRleHQge1xuICBjdHgucHVibGljLmNtZFJlc3VsdCA9IGNtZFJlc3VsdDtcbiAgY3R4LnB1YmxpYy5jbWRPayA9IHRydWU7XG4gIGN0eC5wdWJsaWMuY21kRXJyb3IgPSB1bmRlZmluZWQ7XG4gIGN0eC5wdWJsaWMuY21kQ29kZSA9IDA7XG5cbiAgcmV0dXJuIGN0eDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRDbWRFcnJvclJlc3VsdChcbiAgY3R4OiBDb250ZXh0LFxuICBlcnJvcjogc3RyaW5nLFxuICBjb2RlOiBudW1iZXIsXG4pOiBDb250ZXh0IHtcbiAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSB1bmRlZmluZWQ7XG4gIGN0eC5wdWJsaWMuY21kT2sgPSBmYWxzZTtcbiAgY3R4LnB1YmxpYy5jbWRFcnJvciA9IGVycm9yO1xuICBjdHgucHVibGljLmNtZENvZGUgPSBjb2RlO1xuICByZXR1cm4gY3R4O1xufVxuZnVuY3Rpb24gc3BsaXRDb21tYW5kKFxuICBjb21tYW5kOiBzdHJpbmcsXG4pOiB7IGNvbW1hbmQ6IHN0cmluZzsgdHlwZTogVHlwZTsgbXV0ZWQ6IGJvb2xlYW4gfVtdIHtcbiAgY29uc3QgY29tbWFuZHM6IHsgY29tbWFuZDogc3RyaW5nOyB0eXBlOiBUeXBlOyBtdXRlZDogYm9vbGVhbiB9W10gPSBbXTtcbiAgbGV0IGN1cnJlbnRBcHBlbmRpbmdDb21tYW5kSW5kZXggPSAwO1xuICBsZXQgc3RyaW5nU3RhcnRJbmRleE9mQ3VycmVudENvbW1hbmQgPSAwO1xuICBsZXQgY3VycmVudENvbW1hbmRUeXBlOiBUeXBlID0gVHlwZS5OT19ERVBFTkRFTkNZO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChpID09PSBjb21tYW5kLmxlbmd0aCAtIDEpIHtcbiAgICAgIGNvbW1hbmRzW2N1cnJlbnRBcHBlbmRpbmdDb21tYW5kSW5kZXhdID0ge1xuICAgICAgICBjb21tYW5kOiBjb21tYW5kLnNsaWNlKHN0cmluZ1N0YXJ0SW5kZXhPZkN1cnJlbnRDb21tYW5kKS50cmltKCksXG4gICAgICAgIHR5cGU6IGN1cnJlbnRDb21tYW5kVHlwZSxcbiAgICAgICAgbXV0ZWQ6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY29tbWFuZFtpXSA9PT0gXCImXCIpIHtcbiAgICAgIGlmIChjb21tYW5kW2kgKyAxXSAmJiBjb21tYW5kW2kgKyAxXSA9PT0gXCImXCIpIHtcbiAgICAgICAgY29tbWFuZHNbY3VycmVudEFwcGVuZGluZ0NvbW1hbmRJbmRleF0gPSB7XG4gICAgICAgICAgY29tbWFuZDogY29tbWFuZC5zbGljZShzdHJpbmdTdGFydEluZGV4T2ZDdXJyZW50Q29tbWFuZCwgaSAtIDEpXG4gICAgICAgICAgICAudHJpbSgpLFxuICAgICAgICAgIHR5cGU6IGN1cnJlbnRDb21tYW5kVHlwZSxcbiAgICAgICAgICBtdXRlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIGN1cnJlbnRDb21tYW5kVHlwZSA9IFR5cGUuUFJFVklPVVNfQ09NTUFORF9NVVNUX1NVQ0NFRUQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21tYW5kc1tjdXJyZW50QXBwZW5kaW5nQ29tbWFuZEluZGV4XSA9IHtcbiAgICAgICAgICBjb21tYW5kOiBjb21tYW5kLnNsaWNlKHN0cmluZ1N0YXJ0SW5kZXhPZkN1cnJlbnRDb21tYW5kLCBpIC0gMSlcbiAgICAgICAgICAgIC50cmltKCksXG4gICAgICAgICAgdHlwZTogY3VycmVudENvbW1hbmRUeXBlLFxuICAgICAgICAgIG11dGVkOiB0cnVlLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaSArPSAyO1xuICAgICAgc3RyaW5nU3RhcnRJbmRleE9mQ3VycmVudENvbW1hbmQgPSBpO1xuICAgICAgY3VycmVudEFwcGVuZGluZ0NvbW1hbmRJbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChjb21tYW5kW2ldID09PSBcInxcIikge1xuICAgICAgaWYgKGNvbW1hbmRbaSArIDFdICYmIGNvbW1hbmRbaSArIDFdID09PSBcInxcIikge1xuICAgICAgICBjb21tYW5kc1tjdXJyZW50QXBwZW5kaW5nQ29tbWFuZEluZGV4XSA9IHtcbiAgICAgICAgICBjb21tYW5kOiBjb21tYW5kLnNsaWNlKHN0cmluZ1N0YXJ0SW5kZXhPZkN1cnJlbnRDb21tYW5kLCBpIC0gMSlcbiAgICAgICAgICAgIC50cmltKCksXG4gICAgICAgICAgdHlwZTogY3VycmVudENvbW1hbmRUeXBlLFxuICAgICAgICAgIG11dGVkOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgICAgY3VycmVudENvbW1hbmRUeXBlID0gVHlwZS5QUkVWSU9VU19DT01NQU5EX01VU1RfRkFJTDtcbiAgICAgICAgaSArPSAyO1xuICAgICAgICBzdHJpbmdTdGFydEluZGV4T2ZDdXJyZW50Q29tbWFuZCA9IGk7XG4gICAgICAgIGN1cnJlbnRBcHBlbmRpbmdDb21tYW5kSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbW1hbmRzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElFeGVjUmVzcG9uc2Uge1xuICBjb2RlOiBudW1iZXI7XG4gIHN0ZG91dDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgSU9wdGlvbnMge1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgY29udGludWVPbkVycm9yPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IHJ1bkNtZCA9IGFzeW5jIChcbiAgX2N0eDogQ29udGV4dCxcbiAgY29tbWFuZDogc3RyaW5nLFxuICBvcHRpb25zOiBJT3B0aW9ucyA9IHsgdmVyYm9zZTogZmFsc2UgfSxcbik6IFByb21pc2U8SUV4ZWNSZXNwb25zZT4gPT4ge1xuICBjb25zdCBjb21tYW5kcyA9IHNwbGl0Q29tbWFuZChjb21tYW5kKTtcblxuICBsZXQgb3V0cHV0ID0gXCJcIjtcbiAgbGV0IGxhc3RSdW5GYWlsZWQgPSBmYWxzZTtcblxuICBmb3IgKGNvbnN0IGluZGl2aWR1YWxDb21tYW5kIG9mIGNvbW1hbmRzKSB7XG4gICAgaWYgKFxuICAgICAgaW5kaXZpZHVhbENvbW1hbmQudHlwZSA9PT0gVHlwZS5QUkVWSU9VU19DT01NQU5EX01VU1RfU1VDQ0VFRCAmJlxuICAgICAgbGFzdFJ1bkZhaWxlZFxuICAgICkge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICBgU2tpcHBlZCBjb21tYW5kICcgJHtpbmRpdmlkdWFsQ29tbWFuZC5jb21tYW5kfScgYmVjYXVzZSBsYXN0IHByb2Nlc3MgZGlkIGZhaWxgLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgbGFzdFJ1bkZhaWxlZCA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBpbmRpdmlkdWFsQ29tbWFuZC50eXBlID09PSBUeXBlLlBSRVZJT1VTX0NPTU1BTkRfTVVTVF9GQUlMICYmXG4gICAgICAhbGFzdFJ1bkZhaWxlZFxuICAgICkge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICBgU2tpcHBlZCBjb21tYW5kICcke2luZGl2aWR1YWxDb21tYW5kLmNvbW1hbmR9JyBiZWNhdXNlIGxhc3QgcHJvY2VzcyBkaWRuJ3QgZmFpbGAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBsYXN0UnVuRmFpbGVkID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBFeGVjdXRpbmcgY29tbWFuZCAnJHtpbmRpdmlkdWFsQ29tbWFuZC5jb21tYW5kfSdgKTtcbiAgICB9XG4gICAgY29uc3QgY29tbWFuZFBhcmFtZXRlcnM6IHN0cmluZ1tdID0gZ2V0Q29tbWFuZFBhcmFtcyhcbiAgICAgIGluZGl2aWR1YWxDb21tYW5kLmNvbW1hbmQsXG4gICAgKTtcbiAgICBjb25zdCBwcm9jZXNzOiBEZW5vLlByb2Nlc3MgPSBEZW5vLnJ1bih7XG4gICAgICBjbWQ6IGNvbW1hbmRQYXJhbWV0ZXJzLFxuICAgICAgc3Rkb3V0OiBcInBpcGVkXCIsXG4gICAgICBzdGRlcnI6IFwicGlwZWRcIixcbiAgICB9KTtcbiAgICBsZXQgcmVzcG9uc2UgPSBcIlwiO1xuICAgIGxldCBzdGRlcnIgPSBcIlwiO1xuICAgIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKTtcblxuICAgIGNvbnN0IGJ1ZmYgPSBuZXcgVWludDhBcnJheSgxKTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm9jZXNzLnN0ZG91dD8ucmVhZChidWZmKTtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXNwb25zZSA9IHJlc3BvbnNlICsgZGVjb2Rlci5kZWNvZGUoYnVmZik7XG4gICAgICAgIGF3YWl0IERlbm8uc3Rkb3V0LndyaXRlKGJ1ZmYpO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZXJyb3JCdWZmID0gbmV3IFVpbnQ4QXJyYXkoMSk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvY2Vzcy5zdGRlcnI/LnJlYWQoZXJyb3JCdWZmKTtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdGRlcnIgPSBzdGRlcnIgKyBkZWNvZGVyLmRlY29kZShlcnJvckJ1ZmYpO1xuICAgICAgICBhd2FpdCBEZW5vLnN0ZG91dC53cml0ZShlcnJvckJ1ZmYpO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgcHJvY2Vzcy5zdGF0dXMoKTtcbiAgICBwcm9jZXNzLnN0ZG91dD8uY2xvc2UoKTtcbiAgICBwcm9jZXNzLnN0ZGVycj8uY2xvc2UoKTtcbiAgICBwcm9jZXNzLmNsb3NlKCk7XG5cbiAgICBpZiAoIWluZGl2aWR1YWxDb21tYW5kLm11dGVkICYmICFzdGF0dXMuc3VjY2Vzcykge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICBgUHJvY2VzcyBvZiBjb21tYW5kICcke2luZGl2aWR1YWxDb21tYW5kLmNvbW1hbmR9JyB0aHJldyBhbiBlcnJvcmAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgIGNvbnN0IGVycm9yID0gbmV3IENtZEVycm9yKHN0YXR1cy5jb2RlLCBzdGRlcnIpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhc3RSdW5GYWlsZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsYXN0UnVuRmFpbGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgb3V0cHV0ICs9IHJlc3BvbnNlO1xuICB9XG5cbiAgY29uc3QgZmluYWxTdGRvdXQgPSBvdXRwdXQucmVwbGFjZSgvXFxuJC8sIFwiXCIpO1xuXG4gIHJldHVybiB7XG4gICAgY29kZTogMCxcbiAgICBzdGRvdXQ6IGZpbmFsU3Rkb3V0LFxuICB9O1xufTtcbiJdfQ==