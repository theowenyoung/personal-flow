import { hasPermissionSlient } from "./permission.ts";
import { StepType } from "./internal-interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { isObject } from "./utils/object.ts";
import { parseObject } from "./parse-object.ts";
import { isRemotePath } from "./utils/path.ts";
import { getStepResponse, runStep, setErrorResult } from "./run-step.ts";
import { filterCtxItems, getSourceItemsFromResult, } from "./get-source-items-from-result.ts";
import { config, delay, dirname, join, log, relative, SqliteDb, } from "../deps.ts";
import report, { getReporter } from "./report.ts";
import { Keydb } from "./adapters/json-store-adapter.ts";
import { filterSourceItems } from "./filter-source-items.ts";
import { markSourceItems } from "./mark-source-items.ts";
import { runCmd, setCmdOkResult } from "./run-cmd.ts";
import { getFinalRunOptions, getFinalSourceOptions, getFinalWorkflowOptions, } from "./default-options.ts";
import { runPost } from "./run-post.ts";
import { runAssert } from "./run-assert.ts";
const parse1Keys = ["env"];
const parse2Keys = ["if", "debug"];
const parse3ForGeneralKeys = [
    "if",
    "debug",
    "database",
    "sleep",
    "limit",
    "force",
];
const parse3ForStepKeys = [
    "id",
    "from",
    "use",
    "args",
];
const parse4ForSourceKeys = [
    "force",
    "itemsPath",
    "key",
    "limit",
    "reverse",
];
const parse6ForSourceKeys = [
    "filterFrom",
    "filterItemsFrom",
];
const parse7ForSourceKeys = [
    "cmd",
];
export async function run(runOptions) {
    const debugEnvPermmision = { name: "env", variable: "DEBUG" };
    const dataPermission = { name: "read", path: "data" };
    let DebugEnvValue = undefined;
    if (await hasPermissionSlient(debugEnvPermmision)) {
        DebugEnvValue = Deno.env.get("DEBUG");
    }
    let isDebug = !!(DebugEnvValue !== undefined && DebugEnvValue !== "false");
    const cliWorkflowOptions = getFinalRunOptions(runOptions, isDebug);
    isDebug = cliWorkflowOptions.debug || false;
    const { files, content, } = cliWorkflowOptions;
    let workflowFiles = [];
    const cwd = Deno.cwd();
    if (content) {
        workflowFiles = [];
    }
    else {
        workflowFiles = await getFilesByFilter(cwd, files);
    }
    let env = {};
    const allEnvPermmision = { name: "env" };
    const dotEnvFilePermmision = {
        name: "read",
        path: ".env,.env.defaults,.env.example",
    };
    if (await hasPermissionSlient(dotEnvFilePermmision)) {
        env = config();
    }
    if (await hasPermissionSlient(allEnvPermmision)) {
        env = {
            ...env,
            ...Deno.env.toObject(),
        };
    }
    let validWorkflows = [];
    if (content) {
        const workflow = parseWorkflow(content);
        if (isObject(workflow)) {
            const workflowFilePath = "/tmp/denoflow/tmp-workflow.yml";
            const workflowRelativePath = relative(cwd, workflowFilePath);
            validWorkflows.push({
                ctx: {
                    public: {
                        env,
                        workflowPath: workflowFilePath,
                        workflowRelativePath,
                        workflowCwd: dirname(workflowFilePath),
                        cwd: cwd,
                        sources: {},
                        steps: {},
                        state: undefined,
                        items: [],
                    },
                    itemSourceOptions: undefined,
                    sourcesOptions: [],
                    currentStepType: StepType.Source,
                },
                workflow: workflow,
            });
        }
    }
    const errors = [];
    for (let i = 0; i < workflowFiles.length; i++) {
        const workflowRelativePath = workflowFiles[i];
        let fileContent = "";
        let workflowFilePath = "";
        if (isRemotePath(workflowRelativePath)) {
            const netContent = await fetch(workflowRelativePath);
            workflowFilePath = workflowRelativePath;
            fileContent = await netContent.text();
        }
        else {
            workflowFilePath = join(cwd, workflowRelativePath);
            fileContent = await getContent(workflowFilePath);
        }
        const workflow = parseWorkflow(fileContent);
        if (!isObject(workflow)) {
            continue;
        }
        validWorkflows.push({
            ctx: {
                public: {
                    env,
                    workflowPath: workflowFilePath,
                    workflowRelativePath: workflowRelativePath,
                    workflowCwd: dirname(workflowFilePath),
                    cwd: cwd,
                    sources: {},
                    steps: {},
                    state: undefined,
                    items: [],
                },
                itemSourceOptions: undefined,
                sourcesOptions: [],
                currentStepType: StepType.Source,
            },
            workflow: workflow,
        });
    }
    validWorkflows = validWorkflows.sort((a, b) => {
        const aPath = a.ctx.public.workflowRelativePath;
        const bPath = b.ctx.public.workflowRelativePath;
        if (aPath < bPath) {
            return -1;
        }
        if (aPath > bPath) {
            return 1;
        }
        return 0;
    });
    report.info(` ${validWorkflows.length} valid workflows:\n${validWorkflows.map((item) => getReporterName(item.ctx)).join("\n")}\n`, "Success found");
    for (let workflowIndex = 0; workflowIndex < validWorkflows.length; workflowIndex++) {
        let { ctx, workflow } = validWorkflows[workflowIndex];
        const parsedWorkflowFileOptionsWithEnv = await parseObject(workflow, ctx, {
            keys: parse1Keys,
        });
        if (parsedWorkflowFileOptionsWithEnv.env) {
            for (const key in parsedWorkflowFileOptionsWithEnv.env) {
                const value = parsedWorkflowFileOptionsWithEnv.env[key];
                if (typeof value === "string") {
                    const debugEnvPermmision = { name: "env", variable: key };
                    if (await hasPermissionSlient(debugEnvPermmision)) {
                        Deno.env.set(key, value);
                    }
                }
            }
        }
        const parsedWorkflowGeneralOptionsWithGeneral = await parseObject(parsedWorkflowFileOptionsWithEnv, ctx, {
            keys: parse3ForGeneralKeys,
        });
        const workflowOptions = getFinalWorkflowOptions(parsedWorkflowGeneralOptionsWithGeneral ||
            {}, cliWorkflowOptions);
        isDebug = workflowOptions.debug || false;
        const workflowReporter = getReporter(`${getReporterName(ctx)}`, isDebug);
        if (workflowOptions?.if === false) {
            workflowReporter.info(`because if condition is false`, "Skip workflow");
            continue;
        }
        else {
            workflowReporter.info(``, "Start handle workflow");
        }
        ctx.public.options = workflowOptions;
        const database = workflowOptions.database;
        let db;
        if (database?.startsWith("sqlite")) {
            db = new SqliteDb(database);
        }
        else {
            let namespace = ctx.public.workflowRelativePath;
            if (namespace.startsWith("..")) {
                namespace = `@denoflowRoot${ctx.public.workflowPath}`;
            }
            db = new Keydb(database, {
                namespace: namespace,
            });
        }
        ctx.db = db;
        let state;
        let internalState = {
            keys: [],
        };
        if (await hasPermissionSlient(dataPermission)) {
            state = await db.get("state") || undefined;
            internalState = await db.get("internalState") || {
                keys: [],
            };
        }
        ctx.public.state = state;
        ctx.internalState = internalState;
        ctx.initState = JSON.stringify(state);
        ctx.initInternalState = JSON.stringify(internalState);
        const sources = workflow.sources;
        try {
            if (sources) {
                workflowReporter.info("", "Start get sources");
                for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
                    const source = sources[sourceIndex];
                    ctx.public.sourceIndex = sourceIndex;
                    const sourceReporter = getReporter(`${getReporterName(ctx)} -> source:${ctx.public.sourceIndex}`, isDebug);
                    let sourceOptions = {
                        ...source,
                    };
                    try {
                        sourceOptions = await parseObject(source, ctx, {
                            keys: parse1Keys,
                        });
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse2Keys,
                        });
                        if (sourceOptions?.debug || ctx.public.options?.debug) {
                            sourceReporter.level = log.LogLevels.DEBUG;
                        }
                        if (sourceOptions.if === false) {
                            sourceReporter.info(`because if condition is false`, "Skip source");
                        }
                        sourceOptions = await parseObject(sourceOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...sourceOptions.env,
                                },
                            },
                        }, {
                            keys: parse3ForStepKeys,
                        });
                        sourceOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, sourceOptions);
                        isDebug = sourceOptions.debug || false;
                        if (sourceOptions.if === false) {
                            ctx.public.result = undefined;
                            ctx.public.ok = true;
                            ctx.public.error = undefined;
                            ctx.public.cmdResult = undefined;
                            ctx.public.cmdCode = undefined;
                            ctx.public.cmdOk = true;
                            ctx.public.isRealOk = true;
                            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                            if (sourceOptions.id) {
                                ctx.public.sources[sourceOptions.id] =
                                    ctx.public.sources[sourceIndex];
                            }
                            continue;
                        }
                        ctx = await runStep(ctx, {
                            reporter: sourceReporter,
                            ...sourceOptions,
                        });
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse4ForSourceKeys,
                        });
                        ctx = await getSourceItemsFromResult(ctx, {
                            ...sourceOptions,
                            reporter: sourceReporter,
                        });
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse6ForSourceKeys,
                        });
                        ctx = await filterSourceItems(ctx, {
                            reporter: sourceReporter,
                            ...sourceOptions,
                        });
                        if (sourceOptions.cmd) {
                            sourceOptions = await parseObject(sourceOptions, ctx, {
                                keys: parse7ForSourceKeys,
                            });
                            const cmdResult = await runCmd(ctx, sourceOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        ctx = markSourceItems(ctx, sourceOptions);
                        ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                        if (sourceOptions.id) {
                            ctx.public.sources[sourceOptions.id] =
                                ctx.public.sources[sourceIndex];
                        }
                        if (sourceOptions.assert) {
                            ctx = await runAssert(ctx, {
                                reporter: sourceReporter,
                                ...sourceOptions,
                            });
                        }
                        if (ctx.public.items.length > 0) {
                            sourceReporter.info("", `Source ${sourceIndex} get ${ctx.public.items.length} items`);
                        }
                        if (sourceOptions.post) {
                            await runPost(ctx, {
                                reporter: sourceReporter,
                                ...sourceOptions,
                            });
                        }
                        ctx.sourcesOptions.push(sourceOptions);
                    }
                    catch (e) {
                        ctx = setErrorResult(ctx, e);
                        ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                        if (source.id) {
                            ctx.public.sources[source.id] = ctx.public.sources[sourceIndex];
                        }
                        if (source.continueOnError) {
                            ctx.public.ok = true;
                            sourceReporter.warning(`Failed run source`);
                            sourceReporter.warning(e);
                            sourceReporter.warning(`Ignore this error, because continueOnError is true.`);
                            break;
                        }
                        else {
                            sourceReporter.error(`Failed run source`);
                            throw e;
                        }
                    }
                    sourceOptions = await parseObject(sourceOptions, ctx, {
                        keys: ["sleep"],
                    });
                    if (sourceOptions.sleep && sourceOptions.sleep > 0) {
                        sourceReporter.info(`${sourceOptions.sleep} seconds`, "Sleep");
                        await delay(sourceOptions.sleep * 1000);
                    }
                }
            }
            if (sources) {
                let collectCtxItems = [];
                sources.forEach((_, theSourceIndex) => {
                    if (Array.isArray(ctx.public.sources[theSourceIndex].result)) {
                        collectCtxItems = collectCtxItems.concat(ctx.public.sources[theSourceIndex].result);
                    }
                });
                ctx.public.items = collectCtxItems;
                if (ctx.public.items.length > 0) {
                    workflowReporter.info(`Total ${ctx.public.items.length} items`, "Finish get sources");
                }
            }
            if (ctx.public.items.length === 0) {
                workflowReporter.info(`because no any valid sources items returned`, "Skip workflow");
                continue;
            }
            const filter = workflow.filter;
            if (filter) {
                ctx.currentStepType = StepType.Filter;
                const filterReporter = getReporter(`${getReporterName(ctx)} -> filter`, isDebug);
                let filterOptions = { ...filter };
                try {
                    filterOptions = await parseObject(filter, ctx, {
                        keys: parse1Keys,
                    });
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: parse2Keys,
                    });
                    if (filterOptions?.debug || ctx.public.options?.debug) {
                        filterReporter.level = log.LogLevels.DEBUG;
                    }
                    if (filterOptions.if === false) {
                        filterReporter.info(`because if condition is false`, "Skip filter");
                    }
                    filterOptions = await parseObject(filterOptions, {
                        ...ctx,
                        public: {
                            ...ctx.public,
                            env: {
                                ...ctx.public.env,
                                ...filterOptions.env,
                            },
                        },
                    }, {
                        keys: parse3ForStepKeys,
                    });
                    filterOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, filterOptions);
                    isDebug = filterOptions.debug || false;
                    if (filterOptions.if === false) {
                        continue;
                    }
                    filterReporter.info("", "Start handle filter");
                    ctx = await runStep(ctx, {
                        reporter: filterReporter,
                        ...filterOptions,
                    });
                    if (Array.isArray(ctx.public.result) &&
                        ctx.public.result.length === ctx.public.items.length) {
                        ctx.public.items = ctx.public.items.filter((_item, index) => {
                            return !!(ctx.public.result[index]);
                        });
                        ctx.public.result = ctx.public.items;
                    }
                    else if (filterOptions.run || filterOptions.use) {
                        filterReporter.error(`Failed to run filter script`);
                        throw new Error("Invalid filter step result, result must be array , boolean[], which array length must be equal to ctx.items length");
                    }
                    if (filterOptions.cmd) {
                        filterOptions = await parseObject(filterOptions, ctx, {
                            keys: ["cmd"],
                        });
                        const cmdResult = await runCmd(ctx, filterOptions.cmd);
                        ctx = setCmdOkResult(ctx, cmdResult.stdout);
                    }
                    ctx.public.filter = getStepResponse(ctx);
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: ["limit"],
                    });
                    ctx = filterCtxItems(ctx, {
                        ...filterOptions,
                        reporter: filterReporter,
                    });
                    if (filterOptions.assert) {
                        ctx = await runAssert(ctx, {
                            reporter: filterReporter,
                            ...filterOptions,
                        });
                    }
                    if (filterOptions.post) {
                        await runPost(ctx, {
                            reporter: filterReporter,
                            ...filterOptions,
                        });
                    }
                }
                catch (e) {
                    ctx = setErrorResult(ctx, e);
                    ctx.public.filter = getStepResponse(ctx);
                    if (filter.continueOnError) {
                        ctx.public.ok = true;
                        filterReporter.warning(`Failed to run filter`);
                        filterReporter.warning(e);
                        filterReporter.warning(`Ignore this error, because continueOnError is true.`);
                        break;
                    }
                    else {
                        filterReporter.error(`Failed to run filter`);
                        throw e;
                    }
                }
                filterReporter.info(`Total ${ctx.public.items.length} items`, "Finish handle filter");
                filterOptions = await parseObject(filterOptions, ctx, {
                    keys: ["sleep"],
                });
                if (filterOptions.sleep && filterOptions.sleep > 0) {
                    filterReporter.info(`${filterOptions.sleep} seconds`, "Sleep");
                    await delay(filterOptions.sleep * 1000);
                }
            }
            ctx.currentStepType = StepType.Step;
            for (let index = 0; index < ctx.public.items.length; index++) {
                ctx.public.itemIndex = index;
                ctx.public.item = ctx.public.items[index];
                if (ctx.public.item &&
                    ctx.public.item["@denoflowKey"]) {
                    ctx.public.itemKey =
                        ctx.public.item["@denoflowKey"];
                }
                else if (isObject(ctx.public.item)) {
                    ctx.public.itemKey = undefined;
                    workflowReporter.warning(`Can not found internal item key \`@denoflowKey\`, maybe you changed the item format. Missing this key, denoflow can not store the unique key state. Fix this, Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`);
                }
                else {
                    ctx.public.itemKey = undefined;
                }
                if (ctx.public.item &&
                    (ctx.public.item["@denoflowSourceIndex"]) >= 0) {
                    ctx.public.itemSourceIndex =
                        (ctx.public.item["@denoflowSourceIndex"]);
                    ctx.itemSourceOptions =
                        ctx.sourcesOptions[ctx.public.itemSourceIndex];
                }
                else if (isObject(ctx.public.item)) {
                    ctx.itemSourceOptions = undefined;
                    workflowReporter.warning(`Can not found internal item key \`@denoflowSourceIndex\`, maybe you changed the item format. Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`);
                }
                else {
                    ctx.itemSourceOptions = undefined;
                }
                const itemReporter = getReporter(`${getReporterName(ctx)} -> item:${index}`, isDebug);
                if (ctx.public.options?.debug) {
                    itemReporter.level = log.LogLevels.DEBUG;
                }
                if (!workflow.steps) {
                    workflow.steps = [];
                }
                else {
                    itemReporter.info(``, "Start run steps");
                    itemReporter.debug(`${JSON.stringify(ctx.public.item, null, 2)}`);
                }
                for (let j = 0; j < workflow.steps.length; j++) {
                    const step = workflow.steps[j];
                    ctx.public.stepIndex = j;
                    const stepReporter = getReporter(`${getReporterName(ctx)} -> step:${ctx.public.stepIndex}`, isDebug);
                    let stepOptions = { ...step };
                    try {
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: parse1Keys,
                        });
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: parse2Keys,
                        });
                        if (stepOptions.debug || ctx.public.options?.debug) {
                            stepReporter.level = log.LogLevels.DEBUG;
                        }
                        if (stepOptions.if === false) {
                            stepReporter.info(`because if condition is false`, "Skip step");
                        }
                        stepOptions = await parseObject(stepOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...stepOptions.env,
                                },
                            },
                        }, {
                            keys: parse3ForStepKeys,
                        });
                        stepOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, stepOptions);
                        isDebug = stepOptions.debug || false;
                        stepReporter.debug(`Start run this step.`);
                        if (stepOptions.if === false) {
                            ctx.public.result = undefined;
                            ctx.public.ok = true;
                            ctx.public.error = undefined;
                            ctx.public.cmdResult = undefined;
                            ctx.public.cmdCode = undefined;
                            ctx.public.cmdOk = true;
                            ctx.public.isRealOk = true;
                            ctx.public.steps[j] = getStepResponse(ctx);
                            if (step.id) {
                                ctx.public.steps[step.id] = ctx.public.steps[j];
                            }
                            continue;
                        }
                        ctx = await runStep(ctx, {
                            ...stepOptions,
                            reporter: stepReporter,
                        });
                        if (stepOptions.cmd) {
                            stepOptions = await parseObject(stepOptions, {
                                ...ctx,
                                public: {
                                    ...ctx.public,
                                    env: {
                                        ...ctx.public.env,
                                        ...stepOptions.env,
                                    },
                                },
                            }, {
                                keys: ["cmd"],
                            });
                            const cmdResult = await runCmd(ctx, stepOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        ctx.public.steps[j] = getStepResponse(ctx);
                        if (step.id) {
                            ctx.public.steps[step.id] = ctx.public.steps[j];
                        }
                        stepReporter.debug(`Finish to run this step.`);
                    }
                    catch (e) {
                        ctx.public.steps[j] = getStepResponse(ctx);
                        if (step.id) {
                            ctx.public.steps[step.id] = ctx.public.steps[j];
                        }
                        if (step.continueOnError) {
                            ctx.public.ok = true;
                            stepReporter.warning(`Failed to run step`);
                            stepReporter.warning(e);
                            stepReporter.warning(`Ignore this error, because continueOnError is true.`);
                            break;
                        }
                        else {
                            stepReporter.error(`Failed to run step`);
                            throw e;
                        }
                    }
                    if (stepOptions.assert) {
                        await runAssert(ctx, {
                            reporter: stepReporter,
                            ...stepOptions,
                        });
                    }
                    if (stepOptions.post) {
                        await runPost(ctx, {
                            reporter: stepReporter,
                            ...stepOptions,
                        });
                    }
                    stepReporter.info("", "Finish run step " + j);
                    stepOptions = await parseObject(stepOptions, ctx, {
                        keys: ["sleep"],
                    });
                    if (stepOptions.sleep && stepOptions.sleep > 0) {
                        stepReporter.info(`${stepOptions.sleep} seconds`, "Sleep");
                        await delay(stepOptions.sleep * 1000);
                    }
                }
                if (ctx.itemSourceOptions && !ctx.itemSourceOptions.force) {
                    if (!ctx.internalState || !ctx.internalState.keys) {
                        ctx.internalState.keys = [];
                    }
                    if (ctx.public.itemKey &&
                        !ctx.internalState.keys.includes(ctx.public.itemKey)) {
                        ctx.internalState.keys.unshift(ctx.public.itemKey);
                    }
                    if (ctx.internalState.keys.length > 1000) {
                        ctx.internalState.keys = ctx.internalState.keys.slice(0, 1000);
                    }
                }
                if (workflow.steps.length > 0) {
                    itemReporter.info(``, `Finish run steps`);
                }
            }
            const post = workflow.post;
            if (post) {
                const postReporter = getReporter(`${getReporterName(ctx)} -> post`, isDebug);
                let postOptions = { ...post };
                try {
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: parse1Keys,
                    });
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: parse2Keys,
                    });
                    if (postOptions.debug || ctx.public.options?.debug) {
                        postReporter.level = log.LogLevels.DEBUG;
                    }
                    if (postOptions.if === false) {
                        postReporter.info(`because if condition is false`, "Skip post");
                        continue;
                    }
                    postOptions = await parseObject(postOptions, {
                        ...ctx,
                        public: {
                            ...ctx.public,
                            env: {
                                ...ctx.public.env,
                                ...postOptions.env,
                            },
                        },
                    }, {
                        keys: parse3ForStepKeys,
                    });
                    postOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, postOptions);
                    isDebug = postOptions.debug || false;
                    postReporter.info(`Start run post.`);
                    ctx = await runStep(ctx, {
                        ...postOptions,
                        reporter: postReporter,
                    });
                    if (postOptions.cmd) {
                        postOptions = await parseObject(postOptions, ctx, {
                            keys: ["cmd"],
                        });
                        const cmdResult = await runCmd(ctx, postOptions.cmd);
                        ctx = setCmdOkResult(ctx, cmdResult.stdout);
                    }
                    postReporter.debug(`Finish to run post.`);
                }
                catch (e) {
                    if (post.continueOnError) {
                        ctx.public.ok = true;
                        postReporter.warning(`Failed to run post`);
                        postReporter.warning(e);
                        postReporter.warning(`Ignore this error, because continueOnError is true.`);
                        break;
                    }
                    else {
                        postReporter.error(`Failed to run post`);
                        throw e;
                    }
                }
                if (postOptions.assert) {
                    await runAssert(ctx, {
                        reporter: postReporter,
                        ...postOptions,
                    });
                }
                if (postOptions.post) {
                    await runPost(ctx, {
                        reporter: postReporter,
                        ...postOptions,
                    });
                }
                postReporter.info("", "Finish run post ");
                postOptions = await parseObject(postOptions, ctx, {
                    keys: ["sleep"],
                });
                if (postOptions.sleep && postOptions.sleep > 0) {
                    postReporter.info(`${postOptions.sleep} seconds`, "Sleep");
                    await delay(postOptions.sleep * 1000);
                }
            }
            const currentState = JSON.stringify(ctx.public.state);
            const currentInternalState = JSON.stringify(ctx.internalState);
            if (currentState !== ctx.initState) {
                workflowReporter.debug(`Save state`);
                await ctx.db.set("state", ctx.public.state);
            }
            else {
            }
            if (currentInternalState !== ctx.initInternalState) {
                workflowReporter.debug(`Save internal state`);
                await ctx.db.set("internalState", ctx.internalState);
            }
            else {
            }
            workflowReporter.info(``, "Finish workflow");
        }
        catch (e) {
            workflowReporter.error(`Failed to run this workflow`);
            workflowReporter.error(e);
            if (validWorkflows.length > workflowIndex + 1) {
                workflowReporter.debug("workflow", "Start next workflow");
            }
            errors.push({
                ctx,
                error: e,
            });
        }
        console.log("\n");
    }
    if (errors.length > 0) {
        report.error("Error details:");
        errors.forEach((error) => {
            report.error(`Run ${getReporterName(error.ctx)} failed, error: `);
            report.error(error.error);
        });
        throw new Error(`Failed to run this time`);
    }
}
function getReporterName(ctx) {
    const relativePath = ctx.public.workflowRelativePath;
    const absolutePath = ctx.public.workflowPath;
    if (relativePath.startsWith("..")) {
        return absolutePath;
    }
    else {
        return relativePath;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXdvcmtmbG93cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bi13b3JrZmxvd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBT0EsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pFLE9BQU8sRUFDTCxjQUFjLEVBQ2Qsd0JBQXdCLEdBQ3pCLE1BQU0sbUNBQW1DLENBQUM7QUFDM0MsT0FBTyxFQUNMLE1BQU0sRUFDTixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsUUFBUSxFQUNSLFFBQVEsR0FDVCxNQUFNLFlBQVksQ0FBQztBQUNwQixPQUFPLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FB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QVksQ0FBQztJQUM3QyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDakMsT0FBTyxZQUFZLENBQUM7S0FDckI7U0FBTTtRQUNMLE9BQU8sWUFBWSxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEZpbHRlck9wdGlvbnMsXG4gIFJ1bldvcmtmbG93T3B0aW9ucyxcbiAgU291cmNlT3B0aW9ucyxcbiAgU3RlcE9wdGlvbnMsXG4gIFdvcmtmbG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBoYXNQZXJtaXNzaW9uU2xpZW50IH0gZnJvbSBcIi4vcGVybWlzc2lvbi50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCwgU3RlcFR5cGUgfSBmcm9tIFwiLi9pbnRlcm5hbC1pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IHBhcnNlV29ya2Zsb3cgfSBmcm9tIFwiLi9wYXJzZS13b3JrZmxvdy50c1wiO1xuaW1wb3J0IHsgZ2V0Q29udGVudCB9IGZyb20gXCIuL3V0aWxzL2ZpbGUudHNcIjtcbmltcG9ydCB7IGdldEZpbGVzQnlGaWx0ZXIgfSBmcm9tIFwiLi91dGlscy9maWx0ZXIudHNcIjtcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSBcIi4vdXRpbHMvb2JqZWN0LnRzXCI7XG5pbXBvcnQgeyBwYXJzZU9iamVjdCB9IGZyb20gXCIuL3BhcnNlLW9iamVjdC50c1wiO1xuaW1wb3J0IHsgaXNSZW1vdGVQYXRoIH0gZnJvbSBcIi4vdXRpbHMvcGF0aC50c1wiO1xuaW1wb3J0IHsgZ2V0U3RlcFJlc3BvbnNlLCBydW5TdGVwLCBzZXRFcnJvclJlc3VsdCB9IGZyb20gXCIuL3J1bi1zdGVwLnRzXCI7XG5pbXBvcnQge1xuICBmaWx0ZXJDdHhJdGVtcyxcbiAgZ2V0U291cmNlSXRlbXNGcm9tUmVzdWx0LFxufSBmcm9tIFwiLi9nZXQtc291cmNlLWl0ZW1zLWZyb20tcmVzdWx0LnRzXCI7XG5pbXBvcnQge1xuICBjb25maWcsXG4gIGRlbGF5LFxuICBkaXJuYW1lLFxuICBqb2luLFxuICBsb2csXG4gIHJlbGF0aXZlLFxuICBTcWxpdGVEYixcbn0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCByZXBvcnQsIHsgZ2V0UmVwb3J0ZXIgfSBmcm9tIFwiLi9yZXBvcnQudHNcIjtcbmltcG9ydCB7IEtleWRiIH0gZnJvbSBcIi4vYWRhcHRlcnMvanNvbi1zdG9yZS1hZGFwdGVyLnRzXCI7XG5pbXBvcnQgeyBmaWx0ZXJTb3VyY2VJdGVtcyB9IGZyb20gXCIuL2ZpbHRlci1zb3VyY2UtaXRlbXMudHNcIjtcbmltcG9ydCB7IG1hcmtTb3VyY2VJdGVtcyB9IGZyb20gXCIuL21hcmstc291cmNlLWl0ZW1zLnRzXCI7XG5pbXBvcnQgeyBydW5DbWQsIHNldENtZE9rUmVzdWx0IH0gZnJvbSBcIi4vcnVuLWNtZC50c1wiO1xuaW1wb3J0IHtcbiAgZ2V0RmluYWxSdW5PcHRpb25zLFxuICBnZXRGaW5hbFNvdXJjZU9wdGlvbnMsXG4gIGdldEZpbmFsV29ya2Zsb3dPcHRpb25zLFxufSBmcm9tIFwiLi9kZWZhdWx0LW9wdGlvbnMudHNcIjtcbmltcG9ydCB7IHJ1blBvc3QgfSBmcm9tIFwiLi9ydW4tcG9zdC50c1wiO1xuaW1wb3J0IHsgcnVuQXNzZXJ0IH0gZnJvbSBcIi4vcnVuLWFzc2VydC50c1wiO1xuXG5pbnRlcmZhY2UgVmFsaWRXb3JrZmxvdyB7XG4gIGN0eDogQ29udGV4dDtcbiAgd29ya2Zsb3c6IFdvcmtmbG93T3B0aW9ucztcbn1cblxuY29uc3QgcGFyc2UxS2V5cyA9IFtcImVudlwiXTtcbmNvbnN0IHBhcnNlMktleXMgPSBbXCJpZlwiLCBcImRlYnVnXCJdO1xuY29uc3QgcGFyc2UzRm9yR2VuZXJhbEtleXMgPSBbXG4gIFwiaWZcIixcbiAgXCJkZWJ1Z1wiLFxuICBcImRhdGFiYXNlXCIsXG4gIFwic2xlZXBcIixcbiAgXCJsaW1pdFwiLFxuICBcImZvcmNlXCIsXG5dO1xuY29uc3QgcGFyc2UzRm9yU3RlcEtleXMgPSBbXG4gIFwiaWRcIixcbiAgXCJmcm9tXCIsXG4gIFwidXNlXCIsXG4gIFwiYXJnc1wiLFxuXTtcbmNvbnN0IHBhcnNlNEZvclNvdXJjZUtleXMgPSBbXG4gIFwiZm9yY2VcIixcbiAgXCJpdGVtc1BhdGhcIixcbiAgXCJrZXlcIixcbiAgXCJsaW1pdFwiLFxuICBcInJldmVyc2VcIixcbl07XG5cbmNvbnN0IHBhcnNlNkZvclNvdXJjZUtleXMgPSBbXG4gIFwiZmlsdGVyRnJvbVwiLFxuICBcImZpbHRlckl0ZW1zRnJvbVwiLFxuXTtcbmNvbnN0IHBhcnNlN0ZvclNvdXJjZUtleXMgPSBbXG4gIFwiY21kXCIsXG5dO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuKHJ1bk9wdGlvbnM6IFJ1bldvcmtmbG93T3B0aW9ucykge1xuICBjb25zdCBkZWJ1Z0VudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBcIkRFQlVHXCIgfSBhcyBjb25zdDtcbiAgY29uc3QgZGF0YVBlcm1pc3Npb24gPSB7IG5hbWU6IFwicmVhZFwiLCBwYXRoOiBcImRhdGFcIiB9IGFzIGNvbnN0O1xuICBsZXQgRGVidWdFbnZWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgIERlYnVnRW52VmFsdWUgPSBEZW5vLmVudi5nZXQoXCJERUJVR1wiKTtcbiAgfVxuICBsZXQgaXNEZWJ1ZyA9ICEhKERlYnVnRW52VmFsdWUgIT09IHVuZGVmaW5lZCAmJiBEZWJ1Z0VudlZhbHVlICE9PSBcImZhbHNlXCIpO1xuXG4gIGNvbnN0IGNsaVdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsUnVuT3B0aW9ucyhydW5PcHRpb25zLCBpc0RlYnVnKTtcbiAgaXNEZWJ1ZyA9IGNsaVdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcbiAgY29uc3Qge1xuICAgIGZpbGVzLFxuICAgIGNvbnRlbnQsXG4gIH0gPSBjbGlXb3JrZmxvd09wdGlvbnM7XG4gIGxldCB3b3JrZmxvd0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBjd2QgPSBEZW5vLmN3ZCgpO1xuICBpZiAoY29udGVudCkge1xuICAgIHdvcmtmbG93RmlsZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICB3b3JrZmxvd0ZpbGVzID0gYXdhaXQgZ2V0RmlsZXNCeUZpbHRlcihjd2QsIGZpbGVzKTtcbiAgfVxuXG4gIGxldCBlbnYgPSB7fTtcblxuICBjb25zdCBhbGxFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiIH0gYXMgY29uc3Q7XG5cbiAgLy8gZmlyc3QgdHJ5IHRvIGdldCAuZW52XG4gIGNvbnN0IGRvdEVudkZpbGVQZXJtbWlzaW9uID0ge1xuICAgIG5hbWU6IFwicmVhZFwiLFxuICAgIHBhdGg6IFwiLmVudiwuZW52LmRlZmF1bHRzLC5lbnYuZXhhbXBsZVwiLFxuICB9IGFzIGNvbnN0O1xuXG4gIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRvdEVudkZpbGVQZXJtbWlzaW9uKSkge1xuICAgIGVudiA9IGNvbmZpZygpO1xuICB9XG5cbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoYWxsRW52UGVybW1pc2lvbikpIHtcbiAgICBlbnYgPSB7XG4gICAgICAuLi5lbnYsXG4gICAgICAuLi5EZW5vLmVudi50b09iamVjdCgpLFxuICAgIH07XG4gIH1cblxuICAvLyBnZXQgb3B0aW9uc1xuICBsZXQgdmFsaWRXb3JrZmxvd3M6IFZhbGlkV29ya2Zsb3dbXSA9IFtdO1xuXG4gIC8vIGlmIHN0ZGluXG5cbiAgaWYgKGNvbnRlbnQpIHtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHBhcnNlV29ya2Zsb3coY29udGVudCk7XG5cbiAgICBpZiAoaXNPYmplY3Qod29ya2Zsb3cpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvd0ZpbGVQYXRoID0gXCIvdG1wL2Rlbm9mbG93L3RtcC13b3JrZmxvdy55bWxcIjtcbiAgICAgIGNvbnN0IHdvcmtmbG93UmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoY3dkLCB3b3JrZmxvd0ZpbGVQYXRoKTtcbiAgICAgIHZhbGlkV29ya2Zsb3dzLnB1c2goe1xuICAgICAgICBjdHg6IHtcbiAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgIGVudixcbiAgICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICAgIHdvcmtmbG93UmVsYXRpdmVQYXRoLFxuICAgICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgICBjd2Q6IGN3ZCxcbiAgICAgICAgICAgIHNvdXJjZXM6IHt9LFxuICAgICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGl0ZW1Tb3VyY2VPcHRpb25zOiB1bmRlZmluZWQsXG4gICAgICAgICAgc291cmNlc09wdGlvbnM6IFtdLFxuICAgICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgICB9LFxuICAgICAgICB3b3JrZmxvdzogd29ya2Zsb3csXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrZmxvd0ZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgd29ya2Zsb3dSZWxhdGl2ZVBhdGggPSB3b3JrZmxvd0ZpbGVzW2ldO1xuICAgIGxldCBmaWxlQ29udGVudCA9IFwiXCI7XG4gICAgbGV0IHdvcmtmbG93RmlsZVBhdGggPSBcIlwiO1xuICAgIGlmIChpc1JlbW90ZVBhdGgod29ya2Zsb3dSZWxhdGl2ZVBhdGgpKSB7XG4gICAgICBjb25zdCBuZXRDb250ZW50ID0gYXdhaXQgZmV0Y2god29ya2Zsb3dSZWxhdGl2ZVBhdGgpO1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IHdvcmtmbG93UmVsYXRpdmVQYXRoO1xuICAgICAgZmlsZUNvbnRlbnQgPSBhd2FpdCBuZXRDb250ZW50LnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IGpvaW4oY3dkLCB3b3JrZmxvd1JlbGF0aXZlUGF0aCk7XG4gICAgICBmaWxlQ29udGVudCA9IGF3YWl0IGdldENvbnRlbnQod29ya2Zsb3dGaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBwYXJzZVdvcmtmbG93KGZpbGVDb250ZW50KTtcbiAgICBpZiAoIWlzT2JqZWN0KHdvcmtmbG93KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFsaWRXb3JrZmxvd3MucHVzaCh7XG4gICAgICBjdHg6IHtcbiAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgZW52LFxuICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICB3b3JrZmxvd1JlbGF0aXZlUGF0aDogd29ya2Zsb3dSZWxhdGl2ZVBhdGgsXG4gICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgY3dkOiBjd2QsXG4gICAgICAgICAgc291cmNlczoge30sXG4gICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgIHN0YXRlOiB1bmRlZmluZWQsXG4gICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBpdGVtU291cmNlT3B0aW9uczogdW5kZWZpbmVkLFxuICAgICAgICBzb3VyY2VzT3B0aW9uczogW10sXG4gICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgfSxcbiAgICAgIHdvcmtmbG93OiB3b3JrZmxvdyxcbiAgICB9KTtcbiAgICAvLyBydW4gY29kZVxuICB9XG4gIC8vIHNvcnQgYnkgYWxwaGFiZXRcbiAgdmFsaWRXb3JrZmxvd3MgPSB2YWxpZFdvcmtmbG93cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgYVBhdGggPSBhLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgY29uc3QgYlBhdGggPSBiLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgaWYgKGFQYXRoIDwgYlBhdGgpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgaWYgKGFQYXRoID4gYlBhdGgpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG4gIHJlcG9ydC5pbmZvKFxuICAgIGAgJHt2YWxpZFdvcmtmbG93cy5sZW5ndGh9IHZhbGlkIHdvcmtmbG93czpcXG4ke1xuICAgICAgdmFsaWRXb3JrZmxvd3MubWFwKChpdGVtKSA9PiBnZXRSZXBvcnRlck5hbWUoaXRlbS5jdHgpKS5qb2luKFxuICAgICAgICBcIlxcblwiLFxuICAgICAgKVxuICAgIH1cXG5gLFxuICAgIFwiU3VjY2VzcyBmb3VuZFwiLFxuICApO1xuICAvLyBydW4gd29ya2Zsb3dzIHN0ZXAgYnkgc3RlcFxuICBmb3IgKFxuICAgIGxldCB3b3JrZmxvd0luZGV4ID0gMDtcbiAgICB3b3JrZmxvd0luZGV4IDwgdmFsaWRXb3JrZmxvd3MubGVuZ3RoO1xuICAgIHdvcmtmbG93SW5kZXgrK1xuICApIHtcbiAgICBsZXQgeyBjdHgsIHdvcmtmbG93IH0gPSB2YWxpZFdvcmtmbG93c1t3b3JrZmxvd0luZGV4XTtcbiAgICAvLyBwYXJzZSByb290IGVudiBmaXJzdFxuICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52ID0gYXdhaXQgcGFyc2VPYmplY3Qod29ya2Zsb3csIGN0eCwge1xuICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICB9KSBhcyBXb3JrZmxvd09wdGlvbnM7XG4gICAgLy8gcnVuIGVudlxuICAgIC8vIHBhcnNlIGVudiB0byBlbnZcbiAgICBpZiAocGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYuZW52KSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnYpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnZba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGNvbnN0IGRlYnVnRW52UGVybW1pc2lvbiA9IHsgbmFtZTogXCJlbnZcIiwgdmFyaWFibGU6IGtleSB9IGFzIGNvbnN0O1xuICAgICAgICAgIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRlYnVnRW52UGVybW1pc2lvbikpIHtcbiAgICAgICAgICAgIERlbm8uZW52LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwYXJzZSBnZW5lcmFsIG9wdGlvbnNcblxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93R2VuZXJhbE9wdGlvbnNXaXRoR2VuZXJhbCA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgcGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYsXG4gICAgICBjdHgsXG4gICAgICB7XG4gICAgICAgIGtleXM6IHBhcnNlM0ZvckdlbmVyYWxLZXlzLFxuICAgICAgfSxcbiAgICApIGFzIFdvcmtmbG93T3B0aW9ucztcblxuICAgIGNvbnN0IHdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsV29ya2Zsb3dPcHRpb25zKFxuICAgICAgcGFyc2VkV29ya2Zsb3dHZW5lcmFsT3B0aW9uc1dpdGhHZW5lcmFsIHx8XG4gICAgICAgIHt9LFxuICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICk7XG4gICAgaXNEZWJ1ZyA9IHdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgIGNvbnN0IHdvcmtmbG93UmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfWAsXG4gICAgICBpc0RlYnVnLFxuICAgICk7XG5cbiAgICAvLyBjaGVjayBpZiBuZWVkIHRvIHJ1blxuICAgIGlmICh3b3JrZmxvd09wdGlvbnM/LmlmID09PSBmYWxzZSkge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICBcIlNraXAgd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgICBjb250aW51ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYCxcbiAgICAgICAgXCJTdGFydCBoYW5kbGUgd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgdG8gZ2V0IGRlZmF1bHRcbiAgICBjdHgucHVibGljLm9wdGlvbnMgPSB3b3JrZmxvd09wdGlvbnM7XG5cbiAgICBjb25zdCBkYXRhYmFzZSA9IHdvcmtmbG93T3B0aW9ucy5kYXRhYmFzZSBhcyBzdHJpbmc7XG4gICAgbGV0IGRiO1xuXG4gICAgaWYgKGRhdGFiYXNlPy5zdGFydHNXaXRoKFwic3FsaXRlXCIpKSB7XG4gICAgICBkYiA9IG5ldyBTcWxpdGVEYihkYXRhYmFzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBuYW1lc3BhY2UgPSBjdHgucHVibGljLndvcmtmbG93UmVsYXRpdmVQYXRoO1xuICAgICAgaWYgKG5hbWVzcGFjZS5zdGFydHNXaXRoKFwiLi5cIikpIHtcbiAgICAgICAgLy8gdXNlIGFic29sdXRlIHBhdGggYXMgbmFtZXNwYWNlXG4gICAgICAgIG5hbWVzcGFjZSA9IGBAZGVub2Zsb3dSb290JHtjdHgucHVibGljLndvcmtmbG93UGF0aH1gO1xuICAgICAgfVxuXG4gICAgICBkYiA9IG5ldyBLZXlkYihkYXRhYmFzZSwge1xuICAgICAgICBuYW1lc3BhY2U6IG5hbWVzcGFjZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjdHguZGIgPSBkYjtcbiAgICAvLyBjaGVjayBwZXJtaXNzaW9uXG4gICAgLy8gdW5pcXVlIGtleVxuICAgIGxldCBzdGF0ZTtcbiAgICBsZXQgaW50ZXJuYWxTdGF0ZSA9IHtcbiAgICAgIGtleXM6IFtdLFxuICAgIH07XG4gICAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGF0YVBlcm1pc3Npb24pKSB7XG4gICAgICBzdGF0ZSA9IGF3YWl0IGRiLmdldChcInN0YXRlXCIpIHx8IHVuZGVmaW5lZDtcbiAgICAgIGludGVybmFsU3RhdGUgPSBhd2FpdCBkYi5nZXQoXCJpbnRlcm5hbFN0YXRlXCIpIHx8IHtcbiAgICAgICAga2V5czogW10sXG4gICAgICB9O1xuICAgIH1cbiAgICBjdHgucHVibGljLnN0YXRlID0gc3RhdGU7XG4gICAgY3R4LmludGVybmFsU3RhdGUgPSBpbnRlcm5hbFN0YXRlO1xuICAgIGN0eC5pbml0U3RhdGUgPSBKU09OLnN0cmluZ2lmeShzdGF0ZSk7XG4gICAgY3R4LmluaXRJbnRlcm5hbFN0YXRlID0gSlNPTi5zdHJpbmdpZnkoaW50ZXJuYWxTdGF0ZSk7XG5cbiAgICBjb25zdCBzb3VyY2VzID0gd29ya2Zsb3cuc291cmNlcztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoc291cmNlcykge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXCJcIiwgXCJTdGFydCBnZXQgc291cmNlc1wiKTtcbiAgICAgICAgZm9yIChsZXQgc291cmNlSW5kZXggPSAwOyBzb3VyY2VJbmRleCA8IHNvdXJjZXMubGVuZ3RoOyBzb3VyY2VJbmRleCsrKSB7XG4gICAgICAgICAgY29uc3Qgc291cmNlID0gc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VJbmRleCA9IHNvdXJjZUluZGV4O1xuICAgICAgICAgIGNvbnN0IHNvdXJjZVJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gc291cmNlOiR7Y3R4LnB1YmxpYy5zb3VyY2VJbmRleH1gLFxuICAgICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGxldCBzb3VyY2VPcHRpb25zID0ge1xuICAgICAgICAgICAgLi4uc291cmNlLFxuICAgICAgICAgIH07XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZSwgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBwYXJzZSBpZiBvbmx5XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIGN0eCxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleXM6IHBhcnNlMktleXMsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHNldCBsb2cgbGV2ZWxcbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zPy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgbmVlZCB0byBydW5cbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgICAgXCJTa2lwIHNvdXJjZVwiLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleXM6IHBhcnNlM0ZvclN0ZXBLZXlzLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaXNEZWJ1ZyA9IHNvdXJjZU9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZFJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRDb2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pc1JlYWxPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWQpIHtcbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlT3B0aW9ucy5pZF0gPVxuICAgICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJ1biBzb3VyY2VcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBwYXJzZTRcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2U0Rm9yU291cmNlS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBzb3VyY2UgaXRlbXMgYnkgaXRlbXNQYXRoLCBrZXlcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IGdldFNvdXJjZUl0ZW1zRnJvbVJlc3VsdChjdHgsIHtcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlNlxuXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlNkZvclNvdXJjZUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuICAgICAgICAgICAgLy8gcnVuIHVzZXIgZmlsdGVyLCBmaWx0ZXIgZnJvbSwgZmlsdGVySXRlbXMsIGZpbHRlckl0ZW1zRnJvbSwgb25seSBhbGxvdyBvbmUuXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBmaWx0ZXJTb3VyY2VJdGVtcyhjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHJ1biBjbWRcblxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBwYXJzZTdGb3JTb3VyY2VLZXlzLFxuICAgICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuICAgICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBzb3VyY2VPcHRpb25zLmNtZCBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBtYXJrIHNvdXJjZSBpdGVtcywgYWRkIHVuaXF1ZSBrZXkgYW5kIHNvdXJjZSBpbmRleCB0byBpdGVtc1xuICAgICAgICAgICAgY3R4ID0gbWFya1NvdXJjZUl0ZW1zKGN0eCwgc291cmNlT3B0aW9ucyk7XG4gICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5pZCkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlT3B0aW9ucy5pZF0gPVxuICAgICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgICBjdHggPSBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAvLyBydW4gcG9zdFxuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICAgIFwiXCIsXG4gICAgICAgICAgICAgICAgYFNvdXJjZSAke3NvdXJjZUluZGV4fSBnZXQgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LnNvdXJjZXNPcHRpb25zLnB1c2goc291cmNlT3B0aW9ucyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY3R4ID0gc2V0RXJyb3JSZXN1bHQoY3R4LCBlKTtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZS5pZF0gPSBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvdXJjZS5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCBydW4gc291cmNlYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgSWdub3JlIHRoaXMgZXJyb3IsIGJlY2F1c2UgY29udGludWVPbkVycm9yIGlzIHRydWUuYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHJ1biBzb3VyY2VgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBwYXJzZSA4IHNsZWVwXG4gICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZU9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogW1wic2xlZXBcIl0sXG4gICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5zbGVlcCAmJiBzb3VyY2VPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYCR7c291cmNlT3B0aW9ucy5zbGVlcH0gc2Vjb25kc2AsXG4gICAgICAgICAgICAgIFwiU2xlZXBcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBhd2FpdCBkZWxheShzb3VyY2VPcHRpb25zLnNsZWVwICogMTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGluc2VydCBuZXcgY3R4Lml0ZW1zXG4gICAgICBpZiAoc291cmNlcykge1xuICAgICAgICBsZXQgY29sbGVjdEN0eEl0ZW1zOiB1bmtub3duW10gPSBbXTtcbiAgICAgICAgc291cmNlcy5mb3JFYWNoKChfLCB0aGVTb3VyY2VJbmRleCkgPT4ge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN0eC5wdWJsaWMuc291cmNlc1t0aGVTb3VyY2VJbmRleF0ucmVzdWx0KSkge1xuICAgICAgICAgICAgY29sbGVjdEN0eEl0ZW1zID0gY29sbGVjdEN0eEl0ZW1zLmNvbmNhdChcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3RoZVNvdXJjZUluZGV4XS5yZXN1bHQsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbXMgPSBjb2xsZWN0Q3R4SXRlbXM7XG4gICAgICAgIGlmIChjdHgucHVibGljLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgVG90YWwgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgLFxuICAgICAgICAgICAgXCJGaW5pc2ggZ2V0IHNvdXJjZXNcIixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIGl0ZW1zID4wLCB0aGVuIGNvbnRpbnVlXG4gICAgICBpZiAoKGN0eC5wdWJsaWMuaXRlbXMgYXMgdW5rbm93bltdKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gbm8gbmVlZCB0byBoYW5kbGUgc3RlcHNcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICAgIGBiZWNhdXNlIG5vIGFueSB2YWxpZCBzb3VyY2VzIGl0ZW1zIHJldHVybmVkYCxcbiAgICAgICAgICBcIlNraXAgd29ya2Zsb3dcIixcbiAgICAgICAgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIHJ1biBmaWx0ZXJcbiAgICAgIGNvbnN0IGZpbHRlciA9IHdvcmtmbG93LmZpbHRlcjtcbiAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgY3R4LmN1cnJlbnRTdGVwVHlwZSA9IFN0ZXBUeXBlLkZpbHRlcjtcbiAgICAgICAgY29uc3QgZmlsdGVyUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gZmlsdGVyYCxcbiAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICApO1xuICAgICAgICBsZXQgZmlsdGVyT3B0aW9ucyA9IHsgLi4uZmlsdGVyIH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlciwgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBwYXJzZSBpZiBkZWJ1ZyBvbmx5XG4gICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgIGN0eCxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gc2V0IGxvZyBsZXZlbFxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zPy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY2hlY2sgaWYgbmVlZCB0byBydW5cbiAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgIFwiU2tpcCBmaWx0ZXJcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAvLyBpbnNlcnQgc3RlcCBlbnZcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlzRGVidWcgPSBmaWx0ZXJPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXCJcIiwgXCJTdGFydCBoYW5kbGUgZmlsdGVyXCIpO1xuICAgICAgICAgIC8vIHJ1biBGaWx0ZXJcbiAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KGN0eC5wdWJsaWMucmVzdWx0KSAmJlxuICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQubGVuZ3RoID09PSBjdHgucHVibGljLml0ZW1zLmxlbmd0aFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5pdGVtcyA9IGN0eC5wdWJsaWMuaXRlbXMuZmlsdGVyKChfaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuICEhKChjdHgucHVibGljLnJlc3VsdCBhcyBib29sZWFuW10pW2luZGV4XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgICAgICAgICB9IGVsc2UgaWYgKGZpbHRlck9wdGlvbnMucnVuIHx8IGZpbHRlck9wdGlvbnMudXNlKSB7XG4gICAgICAgICAgICAvLyBpZiBydW4gb3IgdXNlLCB0aGVuIHJlc3VsdCBtdXN0IGJlIGFycmF5XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyIHNjcmlwdGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gaW52YWxpZCByZXN1bHRcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgXCJJbnZhbGlkIGZpbHRlciBzdGVwIHJlc3VsdCwgcmVzdWx0IG11c3QgYmUgYXJyYXkgLCBib29sZWFuW10sIHdoaWNoIGFycmF5IGxlbmd0aCBtdXN0IGJlIGVxdWFsIHRvIGN0eC5pdGVtcyBsZW5ndGhcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IFtcImNtZFwiXSxcbiAgICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBmaWx0ZXJPcHRpb25zLmNtZCBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY3R4LnB1YmxpYy5maWx0ZXIgPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAvLyBwYXJzZSBsaW1pdFxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChmaWx0ZXJPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IFtcImxpbWl0XCJdLFxuICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG4gICAgICAgICAgLy8gcnVuIGZpbHRlclxuICAgICAgICAgIGN0eCA9IGZpbHRlckN0eEl0ZW1zKGN0eCwge1xuICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgIHJlcG9ydGVyOiBmaWx0ZXJSZXBvcnRlcixcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gcnVuIHBvc3RcblxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLnBvc3QpIHtcbiAgICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBmaWx0ZXJSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGN0eCA9IHNldEVycm9yUmVzdWx0KGN0eCwgZSk7XG4gICAgICAgICAgY3R4LnB1YmxpYy5maWx0ZXIgPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcblxuICAgICAgICAgIGlmIChmaWx0ZXIuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlcmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFxuICAgICAgICAgIGBUb3RhbCAke2N0eC5wdWJsaWMuaXRlbXMubGVuZ3RofSBpdGVtc2AsXG4gICAgICAgICAgXCJGaW5pc2ggaGFuZGxlIGZpbHRlclwiLFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgLy8gcGFyc2Ugc2xlZXBcbiAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlck9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5zbGVlcCAmJiBmaWx0ZXJPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgJHtmaWx0ZXJPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgIFwiU2xlZXBcIixcbiAgICAgICAgICApO1xuICAgICAgICAgIGF3YWl0IGRlbGF5KGZpbHRlck9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjdHguY3VycmVudFN0ZXBUeXBlID0gU3RlcFR5cGUuU3RlcDtcblxuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgaW5kZXggPCAoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pLmxlbmd0aDtcbiAgICAgICAgaW5kZXgrK1xuICAgICAgKSB7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbUluZGV4ID0gaW5kZXg7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbSA9IChjdHgucHVibGljLml0ZW1zIGFzIHVua25vd25bXSlbaW5kZXhdO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pICYmXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVtcIkBkZW5vZmxvd0tleVwiXVxuICAgICAgICApIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgPVxuICAgICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVtcIkBkZW5vZmxvd0tleVwiXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChjdHgucHVibGljLml0ZW0pKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHdvcmtmbG93UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgIGBDYW4gbm90IGZvdW5kIGludGVybmFsIGl0ZW0ga2V5IFxcYEBkZW5vZmxvd0tleVxcYCwgbWF5YmUgeW91IGNoYW5nZWQgdGhlIGl0ZW0gZm9ybWF0LiBNaXNzaW5nIHRoaXMga2V5LCBkZW5vZmxvdyBjYW4gbm90IHN0b3JlIHRoZSB1bmlxdWUga2V5IHN0YXRlLiBGaXggdGhpcywgVHJ5IG5vdCBjaGFuZ2UgdGhlIHJlZmVyZW5jZSBpdGVtLCBvbmx5IGNoYW5nZSB0aGUgcHJvcGVydHkgeW91IG5lZWQgdG8gY2hhbmdlLiBUcnkgdG8gbWFudWFsIGFkZGluZyBhIFxcYEBkZW5vZmxvd0tleVxcYCBhcyBpdGVtIHVuaXF1ZSBrZXkuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pICYmXG4gICAgICAgICAgKCgoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW1xuICAgICAgICAgICAgICBcIkBkZW5vZmxvd1NvdXJjZUluZGV4XCJcbiAgICAgICAgICAgIF0pIGFzIG51bWJlcikgPj0gMFxuICAgICAgICApIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1Tb3VyY2VJbmRleCA9XG4gICAgICAgICAgICAoKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtcbiAgICAgICAgICAgICAgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiXG4gICAgICAgICAgICBdKSBhcyBudW1iZXI7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID1cbiAgICAgICAgICAgIGN0eC5zb3VyY2VzT3B0aW9uc1tjdHgucHVibGljLml0ZW1Tb3VyY2VJbmRleF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY3R4LnB1YmxpYy5pdGVtKSkge1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICBgQ2FuIG5vdCBmb3VuZCBpbnRlcm5hbCBpdGVtIGtleSBcXGBAZGVub2Zsb3dTb3VyY2VJbmRleFxcYCwgbWF5YmUgeW91IGNoYW5nZWQgdGhlIGl0ZW0gZm9ybWF0LiBUcnkgbm90IGNoYW5nZSB0aGUgcmVmZXJlbmNlIGl0ZW0sIG9ubHkgY2hhbmdlIHRoZSBwcm9wZXJ0eSB5b3UgbmVlZCB0byBjaGFuZ2UuIFRyeSB0byBtYW51YWwgYWRkaW5nIGEgXFxgQGRlbm9mbG93S2V5XFxgIGFzIGl0ZW0gdW5pcXVlIGtleS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXRlbVJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IGl0ZW06JHtpbmRleH1gLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghd29ya2Zsb3cuc3RlcHMpIHtcbiAgICAgICAgICB3b3JrZmxvdy5zdGVwcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYGAsXG4gICAgICAgICAgICBcIlN0YXJ0IHJ1biBzdGVwc1wiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmRlYnVnKGAke0pTT04uc3RyaW5naWZ5KGN0eC5wdWJsaWMuaXRlbSwgbnVsbCwgMil9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdvcmtmbG93LnN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHdvcmtmbG93LnN0ZXBzW2pdO1xuICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcEluZGV4ID0gajtcbiAgICAgICAgICBjb25zdCBzdGVwUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzdGVwOiR7Y3R4LnB1YmxpYy5zdGVwSW5kZXh9YCxcbiAgICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBsZXQgc3RlcE9wdGlvbnMgPSB7IC4uLnN0ZXAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBwYXJzZSBpZiBvbmx5XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgICAgYGJlY2F1c2UgaWYgY29uZGl0aW9uIGlzIGZhbHNlYCxcbiAgICAgICAgICAgICAgICBcIlNraXAgc3RlcFwiLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywge1xuICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaXNEZWJ1ZyA9IHN0ZXBPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICAgIGBTdGFydCBydW4gdGhpcyBzdGVwLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2N0eDInLGN0eCk7XG5cbiAgICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZFJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRDb2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pc1JlYWxPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgICAgaWYgKHN0ZXAuaWQpIHtcbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW3N0ZXAuaWRdID0gY3R4LnB1YmxpYy5zdGVwc1tqXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuU3RlcChjdHgsIHtcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzdGVwUmVwb3J0ZXIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgICAgLy8gcGFyc2UgY21kXG5cbiAgICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywge1xuICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIGtleXM6IFtcImNtZFwiXSxcbiAgICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIHN0ZXBPcHRpb25zLmNtZCBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICBpZiAoc3RlcC5pZCkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW3N0ZXAuaWRdID0gY3R4LnB1YmxpYy5zdGVwc1tqXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgICAgICBgRmluaXNoIHRvIHJ1biB0aGlzIHN0ZXAuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tqXSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuXG4gICAgICAgICAgICBpZiAoc3RlcC5pZCkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW3N0ZXAuaWRdID0gY3R4LnB1YmxpYy5zdGVwc1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGVwLmNvbnRpbnVlT25FcnJvcikge1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gc3RlcGAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgSWdub3JlIHRoaXMgZXJyb3IsIGJlY2F1c2UgY29udGludWVPbkVycm9yIGlzIHRydWUuYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gc3RlcGAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHRoaXMgaXRlbSBzdGVwcyBhbGwgb2ssIGFkZCB1bmlxdWUga2V5cyB0byB0aGUgaW50ZXJuYWwgc3RhdGVcblxuICAgICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuYXNzZXJ0KSB7XG4gICAgICAgICAgICBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzdGVwUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLnBvc3QpIHtcbiAgICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzdGVwUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ZXBSZXBvcnRlci5pbmZvKFwiXCIsIFwiRmluaXNoIHJ1biBzdGVwIFwiICsgaik7XG5cbiAgICAgICAgICAvLyBwYXJzZSBzbGVlcFxuICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogW1wic2xlZXBcIl0sXG4gICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLnNsZWVwICYmIHN0ZXBPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGAke3N0ZXBPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KHN0ZXBPcHRpb25zLnNsZWVwICogMTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNoZWNrIGlzICFmb3JjZVxuICAgICAgICAvLyBnZXQgaXRlbSBzb3VyY2Ugb3B0aW9uc1xuICAgICAgICBpZiAoY3R4Lml0ZW1Tb3VyY2VPcHRpb25zICYmICFjdHguaXRlbVNvdXJjZU9wdGlvbnMuZm9yY2UpIHtcbiAgICAgICAgICBpZiAoIWN0eC5pbnRlcm5hbFN0YXRlIHx8ICFjdHguaW50ZXJuYWxTdGF0ZS5rZXlzKSB7XG4gICAgICAgICAgICBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cyA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgJiZcbiAgICAgICAgICAgICFjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy5pbmNsdWRlcyhjdHgucHVibGljLml0ZW1LZXkhKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY3R4LmludGVybmFsU3RhdGUhLmtleXMudW5zaGlmdChjdHgucHVibGljLml0ZW1LZXkhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gb25seSBzYXZlIDEwMDAgaXRlbXMgZm9yIHNhdmUgbWVtb3J5XG4gICAgICAgICAgaWYgKGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLmxlbmd0aCA+IDEwMDApIHtcbiAgICAgICAgICAgIGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzID0gY3R4LmludGVybmFsU3RhdGUhLmtleXMuc2xpY2UoMCwgMTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh3b3JrZmxvdy5zdGVwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgYCxcbiAgICAgICAgICAgIGBGaW5pc2ggcnVuIHN0ZXBzYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHJ1biBwb3N0IHN0ZXBcbiAgICAgIGNvbnN0IHBvc3QgPSB3b3JrZmxvdy5wb3N0O1xuICAgICAgaWYgKHBvc3QpIHtcbiAgICAgICAgY29uc3QgcG9zdFJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IHBvc3RgLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGxldCBwb3N0T3B0aW9ucyA9IHsgLi4ucG9zdCB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcblxuICAgICAgICAgIC8vIHBhcnNlIGlmIG9ubHlcbiAgICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IHBhcnNlMktleXMsXG4gICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgaWYgKHBvc3RPcHRpb25zLmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwb3N0T3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICBcIlNraXAgcG9zdFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIHtcbiAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAuLi5wb3N0T3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIGtleXM6IHBhcnNlM0ZvclN0ZXBLZXlzLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBwb3N0T3B0aW9ucyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlzRGVidWcgPSBwb3N0T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYFN0YXJ0IHJ1biBwb3N0LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnY3R4MicsY3R4KTtcblxuICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAuLi5wb3N0T3B0aW9ucyxcbiAgICAgICAgICAgIHJlcG9ydGVyOiBwb3N0UmVwb3J0ZXIsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHBvc3RPcHRpb25zLmNtZCkge1xuICAgICAgICAgICAgLy8gcGFyc2UgY21kXG4gICAgICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBwb3N0T3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcG9zdFJlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgICAgYEZpbmlzaCB0byBydW4gcG9zdC5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAocG9zdC5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIHBvc3RgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIHBvc3RgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMgaXRlbSBzdGVwcyBhbGwgb2ssIGFkZCB1bmlxdWUga2V5cyB0byB0aGUgaW50ZXJuYWwgc3RhdGVcblxuICAgICAgICAvLyBydW4gYXNzZXJ0XG4gICAgICAgIGlmIChwb3N0T3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICByZXBvcnRlcjogcG9zdFJlcG9ydGVyLFxuICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zdE9wdGlvbnMucG9zdCkge1xuICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICByZXBvcnRlcjogcG9zdFJlcG9ydGVyLFxuICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXCJcIiwgXCJGaW5pc2ggcnVuIHBvc3QgXCIpO1xuXG4gICAgICAgIC8vIHBhcnNlIHNsZWVwXG4gICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICBpZiAocG9zdE9wdGlvbnMuc2xlZXAgJiYgcG9zdE9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgJHtwb3N0T3B0aW9ucy5zbGVlcH0gc2Vjb25kc2AsXG4gICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBhd2FpdCBkZWxheShwb3N0T3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNhdmUgc3RhdGUsIGludGVybmFsU3RhdGVcbiAgICAgIC8vIGNoZWNrIGlzIGNoYW5nZWRcbiAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KGN0eC5wdWJsaWMuc3RhdGUpO1xuICAgICAgLy8gYWRkIHN1Y2Nlc3MgaXRlbXMgdW5pcXVlS2V5IHRvIGludGVybmFsIFN0YXRlXG5cbiAgICAgIGNvbnN0IGN1cnJlbnRJbnRlcm5hbFN0YXRlID0gSlNPTi5zdHJpbmdpZnkoY3R4LmludGVybmFsU3RhdGUpO1xuICAgICAgaWYgKGN1cnJlbnRTdGF0ZSAhPT0gY3R4LmluaXRTdGF0ZSkge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKGBTYXZlIHN0YXRlYCk7XG4gICAgICAgIGF3YWl0IGN0eC5kYiEuc2V0KFwic3RhdGVcIiwgY3R4LnB1YmxpYy5zdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKGBTa2lwIHNhdmUgc2F0ZSwgY2F1c2Ugbm8gY2hhbmdlIGhhcHBlbmVkYCk7XG4gICAgICB9XG4gICAgICBpZiAoY3VycmVudEludGVybmFsU3RhdGUgIT09IGN0eC5pbml0SW50ZXJuYWxTdGF0ZSkge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgIGBTYXZlIGludGVybmFsIHN0YXRlYCxcbiAgICAgICAgKTtcbiAgICAgICAgYXdhaXQgY3R4LmRiIS5zZXQoXCJpbnRlcm5hbFN0YXRlXCIsIGN0eC5pbnRlcm5hbFN0YXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdvcmtmbG93UmVwb3J0ZXIuZGVidWcoXG4gICAgICAgIC8vICAgYFNraXAgc2F2ZSBpbnRlcm5hbCBzdGF0ZSwgY2F1c2Ugbm8gY2hhbmdlIGhhcHBlbmVkYCxcbiAgICAgICAgLy8gKTtcbiAgICAgIH1cbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgYGAsXG4gICAgICAgIFwiRmluaXNoIHdvcmtmbG93XCIsXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gcnVuIHRoaXMgd29ya2Zsb3dgLFxuICAgICAgKTtcblxuICAgICAgd29ya2Zsb3dSZXBvcnRlci5lcnJvcihlKTtcbiAgICAgIGlmICh2YWxpZFdvcmtmbG93cy5sZW5ndGggPiB3b3JrZmxvd0luZGV4ICsgMSkge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFwid29ya2Zsb3dcIiwgXCJTdGFydCBuZXh0IHdvcmtmbG93XCIpO1xuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBjdHgsXG4gICAgICAgIGVycm9yOiBlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwiXFxuXCIpO1xuICB9XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHJlcG9ydC5lcnJvcihcIkVycm9yIGRldGFpbHM6XCIpO1xuICAgIGVycm9ycy5mb3JFYWNoKChlcnJvcikgPT4ge1xuICAgICAgcmVwb3J0LmVycm9yKFxuICAgICAgICBgUnVuICR7Z2V0UmVwb3J0ZXJOYW1lKGVycm9yLmN0eCl9IGZhaWxlZCwgZXJyb3I6IGAsXG4gICAgICApO1xuICAgICAgcmVwb3J0LmVycm9yKGVycm9yLmVycm9yKTtcbiAgICB9KTtcblxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJ1biB0aGlzIHRpbWVgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZXBvcnRlck5hbWUoY3R4OiBDb250ZXh0KSB7XG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gIGNvbnN0IGFic29sdXRlUGF0aCA9IGN0eC5wdWJsaWMud29ya2Zsb3dQYXRoO1xuICBpZiAocmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoXCIuLlwiKSkge1xuICAgIHJldHVybiBhYnNvbHV0ZVBhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlbGF0aXZlUGF0aDtcbiAgfVxufVxuIl19