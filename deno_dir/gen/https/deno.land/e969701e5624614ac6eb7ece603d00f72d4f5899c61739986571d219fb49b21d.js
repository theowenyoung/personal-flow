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
];
const parse6ForSourceKeys = [
    "limit",
    "filterFrom",
    "filterItemsFrom",
];
const parse7ForSourceKeys = [
    "cmd",
];
const parse8ForSourceKeys = [
    "limit",
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
                            keys: ["reverse"],
                        });
                        if (sourceOptions.reverse) {
                            ctx.public.items = ctx.public.items.reverse();
                        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXdvcmtmbG93cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bi13b3JrZmxvd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBT0EsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pFLE9BQU8sRUFDTCxjQUFjLEVBQ2Qsd0JBQXdCLEdBQ3pCLE1BQU0sbUNBQW1DLENBQUM7QUFDM0MsT0FBTyxFQUNMLE1BQU0sRUFDTixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsUUFBUSxFQUNSLFFBQVEsR0FDVCxNQUFNLFlBQVksQ0FBQztBQUNwQixPQUFPLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RELE9BQU8sRUFDTCxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLHVCQUF1QixHQUN4QixNQUFNLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDeEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBTzVDLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0IsTUFBTSxVQUFVLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDbkMsTUFBTSxvQkFBb0IsR0FBRztJQUMzQixJQUFJO0lBQ0osT0FBTztJQUNQLFVBQVU7SUFDVixPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87Q0FDUixDQUFDO0FBQ0YsTUFBTSxpQkFBaUIsR0FBRztJQUN4QixJQUFJO0lBQ0osTUFBTTtJQUNOLEtBQUs7SUFDTCxNQUFNO0NBQ1AsQ0FBQztBQUNGLE1BQU0sbUJBQW1CLEdBQUc7SUFDMUIsT0FBTztJQUNQLFdBQVc7SUFDWCxLQUFLO0NBQ04sQ0FBQztBQUVGLE1BQU0sbUJBQW1CLEdBQUc7SUFDMUIsT0FBTztJQUNQLFlBQVk7SUFDWixpQkFBaUI7Q0FDbEIsQ0FBQztBQUNGLE1BQU0sbUJBQW1CLEdBQUc7SUFDMUIsS0FBSztDQUNOLENBQUM7QUFDRixNQUFNLG1CQUFtQixHQUFHO0lBQzFCLE9BQU87Q0FDUixDQUFDO0FBRUYsTUFBTSxDQUFDLEtBQUssVUFBVSxHQUFHLENBQUMsVUFBOEI7SUFDdEQsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBVyxDQUFDO0lBQ3ZFLE1BQU0sY0FBYyxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFXLENBQUM7SUFDL0QsSUFBSSxhQUFhLEdBQUcsU0FBUyxDQUFDO0lBQzlCLElBQUksTUFBTSxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1FBQ2pELGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUN2QztJQUNELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsS0FBSyxTQUFTLElBQUksYUFBYSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0lBRTNFLE1BQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25FLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO0lBQzVDLE1BQU0sRUFDSixLQUFLLEVBQ0wsT0FBTyxHQUNSLEdBQUcsa0JBQWtCLENBQUM7SUFDdkIsSUFBSSxhQUFhLEdBQWEsRUFBRSxDQUFDO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN2QixJQUFJLE9BQU8sRUFBRTtRQUNYLGFBQWEsR0FBRyxFQUFFLENBQUM7S0FDcEI7U0FBTTtRQUNMLGFBQWEsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUNwRDtJQUVELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUViLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFXLENBQUM7SUFHbEQsTUFBTSxvQkFBb0IsR0FBRztRQUMzQixJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRSxpQ0FBaUM7S0FDL0IsQ0FBQztJQUVYLElBQUksTUFBTSxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFO1FBQ25ELEdBQUcsR0FBRyxNQUFNLEVBQUUsQ0FBQztLQUNoQjtJQUVELElBQUksTUFBTSxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQy9DLEdBQUcsR0FBRztZQUNKLEdBQUcsR0FBRztZQUNOLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7U0FDdkIsQ0FBQztLQUNIO0lBR0QsSUFBSSxjQUFjLEdBQW9CLEVBQUUsQ0FBQztJQUl6QyxJQUFJLE9BQU8sRUFBRTtRQUNYLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV4QyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN0QixNQUFNLGdCQUFnQixHQUFHLGdDQUFnQyxDQUFDO1lBQzFELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzdELGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLEdBQUcsRUFBRTtvQkFDSCxNQUFNLEVBQUU7d0JBQ04sR0FBRzt3QkFDSCxZQUFZLEVBQUUsZ0JBQWdCO3dCQUM5QixvQkFBb0I7d0JBQ3BCLFdBQVcsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUM7d0JBQ3RDLEdBQUcsRUFBRSxHQUFHO3dCQUNSLE9BQU8sRUFBRSxFQUFFO3dCQUNYLEtBQUssRUFBRSxFQUFFO3dCQUNULEtBQUssRUFBRSxTQUFTO3dCQUNoQixLQUFLLEVBQUUsRUFBRTtxQkFDVjtvQkFDRCxpQkFBaUIsRUFBRSxTQUFTO29CQUM1QixjQUFjLEVBQUUsRUFBRTtvQkFDbEIsZUFBZSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2lCQUNqQztnQkFDRCxRQUFRLEVBQUUsUUFBUTthQUNuQixDQUFDLENBQUM7U0FDSjtLQUNGO0lBRUQsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzdDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUMxQixJQUFJLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFO1lBQ3RDLE1BQU0sVUFBVSxHQUFHLE1BQU0sS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDckQsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUM7WUFDeEMsV0FBVyxHQUFHLE1BQU0sVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3ZDO2FBQU07WUFDTCxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDbkQsV0FBVyxHQUFHLE1BQU0sVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDbEQ7UUFFRCxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN2QixTQUFTO1NBQ1Y7UUFFRCxjQUFjLENBQUMsSUFBSSxDQUFDO1lBQ2xCLEdBQUcsRUFBRTtnQkFDSCxNQUFNLEVBQUU7b0JBQ04sR0FBRztvQkFDSCxZQUFZLEVBQUUsZ0JBQWdCO29CQUM5QixvQkFBb0IsRUFBRSxvQkFBb0I7b0JBQzFDLFdBQVcsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUM7b0JBQ3RDLEdBQUcsRUFBRSxHQUFHO29CQUNSLE9BQU8sRUFBRSxFQUFFO29CQUNYLEtBQUssRUFBRSxFQUFFO29CQUNULEtBQUssRUFBRSxTQUFTO29CQUNoQixLQUFLLEVBQUUsRUFBRTtpQkFDVjtnQkFDRCxpQkFBaUIsRUFBRSxTQUFTO2dCQUM1QixjQUFjLEVBQUUsRUFBRTtnQkFDbEIsZUFBZSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ2pDO1lBQ0QsUUFBUSxFQUFFLFFBQVE7U0FDbkIsQ0FBQyxDQUFDO0tBRUo7SUFFRCxjQUFjLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztRQUNoRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztRQUNoRCxJQUFJLEtBQUssR0FBRyxLQUFLLEVBQUU7WUFDakIsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNYO1FBQ0QsSUFBSSxLQUFLLEdBQUcsS0FBSyxFQUFFO1lBQ2pCLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLElBQUksQ0FDVCxJQUFJLGNBQWMsQ0FBQyxNQUFNLHNCQUN2QixjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUMxRCxJQUFJLENBRVIsSUFBSSxFQUNKLGVBQWUsQ0FDaEIsQ0FBQztJQUVGLEtBQ0UsSUFBSSxhQUFhLEdBQUcsQ0FBQyxFQUNyQixhQUFhLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFDckMsYUFBYSxFQUFFLEVBQ2Y7UUFDQSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUd0RCxNQUFNLGdDQUFnQyxHQUFHLE1BQU0sV0FBVyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDeEUsSUFBSSxFQUFFLFVBQVU7U0FDakIsQ0FBb0IsQ0FBQztRQUd0QixJQUFJLGdDQUFnQyxDQUFDLEdBQUcsRUFBRTtZQUN4QyxLQUFLLE1BQU0sR0FBRyxJQUFJLGdDQUFnQyxDQUFDLEdBQUcsRUFBRTtnQkFDdEQsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtvQkFDN0IsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBVyxDQUFDO29CQUNuRSxJQUFJLE1BQU0sbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsRUFBRTt3QkFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO3FCQUMxQjtpQkFDRjthQUNGO1NBQ0Y7UUFJRCxNQUFNLHVDQUF1QyxHQUFHLE1BQU0sV0FBVyxDQUMvRCxnQ0FBZ0MsRUFDaEMsR0FBRyxFQUNIO1lBQ0UsSUFBSSxFQUFFLG9CQUFvQjtTQUMzQixDQUNpQixDQUFDO1FBRXJCLE1BQU0sZUFBZSxHQUFHLHVCQUF1QixDQUM3Qyx1Q0FBdUM7WUFDckMsRUFBRSxFQUNKLGtCQUFrQixDQUNuQixDQUFDO1FBQ0YsT0FBTyxHQUFHLGVBQWUsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO1FBRXpDLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUNsQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUN6QixPQUFPLENBQ1IsQ0FBQztRQUdGLElBQUksZUFBZSxFQUFFLEVBQUUsS0FBSyxLQUFLLEVBQUU7WUFDakMsZ0JBQWdCLENBQUMsSUFBSSxDQUNuQiwrQkFBK0IsRUFDL0IsZUFBZSxDQUNoQixDQUFDO1lBQ0YsU0FBUztTQUNWO2FBQU07WUFDTCxnQkFBZ0IsQ0FBQyxJQUFJLENBQ25CLEVBQUUsRUFDRix1QkFBdUIsQ0FDeEIsQ0FBQztTQUNIO1FBR0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsZUFBZSxDQUFDO1FBRXJDLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFrQixDQUFDO1FBQ3BELElBQUksRUFBRSxDQUFDO1FBQ1AsSUFBSSxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2xDLEVBQUUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM3QjthQUFNO1lBQ0wsSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztZQUNoRCxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBRTlCLFNBQVMsR0FBRyxnQkFBZ0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQzthQUN2RDtZQUNELEVBQUUsR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxTQUFTO2FBQ3JCLENBQUMsQ0FBQztTQUNKO1FBQ0QsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFHWixJQUFJLEtBQUssQ0FBQztRQUNWLElBQUksYUFBYSxHQUFHO1lBQ2xCLElBQUksRUFBRSxFQUFFO1NBQ1QsQ0FBQztRQUNGLElBQUksTUFBTSxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUM3QyxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQztZQUMzQyxhQUFhLEdBQUcsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJO2dCQUMvQyxJQUFJLEVBQUUsRUFBRTthQUNULENBQUM7U0FDSDtRQUNELEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUN6QixHQUFHLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNsQyxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEMsR0FBRyxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFdEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUVqQyxJQUFJO1lBQ0YsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUMvQyxLQUFLLElBQUksV0FBVyxHQUFHLENBQUMsRUFBRSxXQUFXLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRTtvQkFDckUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNwQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7b0JBQ3JDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FDaEMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFDN0QsT0FBTyxDQUNSLENBQUM7b0JBQ0YsSUFBSSxhQUFhLEdBQUc7d0JBQ2xCLEdBQUcsTUFBTTtxQkFDVixDQUFDO29CQUNGLElBQUk7d0JBRUYsYUFBYSxHQUFHLE1BQU0sV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7NEJBQzdDLElBQUksRUFBRSxVQUFVO3lCQUNqQixDQUFrQixDQUFDO3dCQUdwQixhQUFhLEdBQUcsTUFBTSxXQUFXLENBQy9CLGFBQWEsRUFDYixHQUFHLEVBQ0g7NEJBQ0UsSUFBSSxFQUFFLFVBQVU7eUJBQ2pCLENBQ2UsQ0FBQzt3QkFHbkIsSUFBSSxhQUFhLEVBQUUsS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRTs0QkFDckQsY0FBYyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQzt5QkFDNUM7d0JBR0QsSUFBSSxhQUFhLENBQUMsRUFBRSxLQUFLLEtBQUssRUFBRTs0QkFDOUIsY0FBYyxDQUFDLElBQUksQ0FDakIsK0JBQStCLEVBQy9CLGFBQWEsQ0FDZCxDQUFDO3lCQUNIO3dCQUlELGFBQWEsR0FBRyxNQUFNLFdBQVcsQ0FDL0IsYUFBYSxFQUNiOzRCQUNFLEdBQUcsR0FBRzs0QkFDTixNQUFNLEVBQUU7Z0NBQ04sR0FBRyxHQUFHLENBQUMsTUFBTTtnQ0FDYixHQUFHLEVBQUU7b0NBQ0gsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUc7b0NBQ2pCLEdBQUcsYUFBYSxDQUFDLEdBQUc7aUNBQ3JCOzZCQUNGO3lCQUNGLEVBQ0Q7NEJBQ0UsSUFBSSxFQUFFLGlCQUFpQjt5QkFDeEIsQ0FDZSxDQUFDO3dCQUduQixhQUFhLEdBQUcscUJBQXFCLENBQ25DLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsYUFBYSxDQUNkLENBQUM7d0JBQ0YsT0FBTyxHQUFHLGFBQWEsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO3dCQUd2QyxJQUFJLGFBQWEsQ0FBQyxFQUFFLEtBQUssS0FBSyxFQUFFOzRCQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7NEJBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQzs0QkFDckIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDOzRCQUM3QixHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7NEJBQ2pDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQzs0QkFDL0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDOzRCQUN4QixHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7NEJBQzNCLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDdkQsSUFBSSxhQUFhLENBQUMsRUFBRSxFQUFFO2dDQUNwQixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29DQUNsQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQzs2QkFDbkM7NEJBQ0QsU0FBUzt5QkFDVjt3QkFFRCxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFOzRCQUN2QixRQUFRLEVBQUUsY0FBYzs0QkFDeEIsR0FBRyxhQUFhO3lCQUNqQixDQUFDLENBQUM7d0JBR0gsYUFBYSxHQUFHLE1BQU0sV0FBVyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7NEJBQ3BELElBQUksRUFBRSxtQkFBbUI7eUJBQzFCLENBQWtCLENBQUM7d0JBR3BCLEdBQUcsR0FBRyxNQUFNLHdCQUF3QixDQUFDLEdBQUcsRUFBRTs0QkFDeEMsR0FBRyxhQUFhOzRCQUNoQixRQUFRLEVBQUUsY0FBYzt5QkFDekIsQ0FBQyxDQUFDO3dCQUVILGFBQWEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFOzRCQUNwRCxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7eUJBQ2xCLENBQWtCLENBQUM7d0JBRXBCLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRTs0QkFFekIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7eUJBQy9DO3dCQUdELGFBQWEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFOzRCQUNwRCxJQUFJLEVBQUUsbUJBQW1CO3lCQUMxQixDQUFrQixDQUFDO3dCQUVwQixHQUFHLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7NEJBQ2pDLFFBQVEsRUFBRSxjQUFjOzRCQUN4QixHQUFHLGFBQWE7eUJBQ2pCLENBQUMsQ0FBQzt3QkFJSCxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUU7NEJBQ3JCLGFBQWEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO2dDQUNwRCxJQUFJLEVBQUUsbUJBQW1COzZCQUMxQixDQUFrQixDQUFDOzRCQUNwQixNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLEdBQWEsQ0FBQyxDQUFDOzRCQUNqRSxHQUFHLEdBQUcsY0FBYyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7eUJBQzdDO3dCQUdELEdBQUcsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO3dCQUMxQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3ZELElBQUksYUFBYSxDQUFDLEVBQUUsRUFBRTs0QkFDcEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQ0FDbEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7eUJBQ25DO3dCQUdELElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRTs0QkFDeEIsR0FBRyxHQUFHLE1BQU0sU0FBUyxDQUFDLEdBQUcsRUFBRTtnQ0FDekIsUUFBUSxFQUFFLGNBQWM7Z0NBQ3hCLEdBQUcsYUFBYTs2QkFDakIsQ0FBQyxDQUFDO3lCQUNKO3dCQUNELElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTs0QkFFL0IsY0FBYyxDQUFDLElBQUksQ0FDakIsRUFBRSxFQUNGLFVBQVUsV0FBVyxRQUFRLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sUUFBUSxDQUM3RCxDQUFDO3lCQUNIO3dCQUVELElBQUksYUFBYSxDQUFDLElBQUksRUFBRTs0QkFDdEIsTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFO2dDQUNqQixRQUFRLEVBQUUsY0FBYztnQ0FDeEIsR0FBRyxhQUFhOzZCQUNqQixDQUFDLENBQUM7eUJBQ0o7d0JBQ0QsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7cUJBQ3hDO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNWLEdBQUcsR0FBRyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUM3QixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3ZELElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRTs0QkFDYixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7eUJBQ2pFO3dCQUNELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRTs0QkFDMUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDOzRCQUNyQixjQUFjLENBQUMsT0FBTyxDQUNwQixtQkFBbUIsQ0FDcEIsQ0FBQzs0QkFDRixjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUMxQixjQUFjLENBQUMsT0FBTyxDQUNwQixxREFBcUQsQ0FDdEQsQ0FBQzs0QkFDRixNQUFNO3lCQUNQOzZCQUFNOzRCQUNMLGNBQWMsQ0FBQyxLQUFLLENBQ2xCLG1CQUFtQixDQUNwQixDQUFDOzRCQUNGLE1BQU0sQ0FBQyxDQUFDO3lCQUNUO3FCQUNGO29CQUVELGFBQWEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO3dCQUNwRCxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7cUJBQ2hCLENBQWtCLENBQUM7b0JBR3BCLElBQUksYUFBYSxDQUFDLEtBQUssSUFBSSxhQUFhLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTt3QkFDbEQsY0FBYyxDQUFDLElBQUksQ0FDakIsR0FBRyxhQUFhLENBQUMsS0FBSyxVQUFVLEVBQ2hDLE9BQU8sQ0FDUixDQUFDO3dCQUNGLE1BQU0sS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7cUJBQ3pDO2lCQUNGO2FBQ0Y7WUFHRCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxJQUFJLGVBQWUsR0FBYyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLEVBQUU7b0JBQ3BDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDNUQsZUFBZSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQ3RDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sQ0FDMUMsQ0FBQztxQkFDSDtnQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDSCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUM7Z0JBQ25DLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDL0IsZ0JBQWdCLENBQUMsSUFBSSxDQUNuQixTQUFTLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sUUFBUSxFQUN4QyxvQkFBb0IsQ0FDckIsQ0FBQztpQkFDSDthQUNGO1lBR0QsSUFBSyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQW1CLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFFaEQsZ0JBQWdCLENBQUMsSUFBSSxDQUNuQiw2Q0FBNkMsRUFDN0MsZUFBZSxDQUNoQixDQUFDO2dCQUNGLFNBQVM7YUFDVjtZQUdELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDL0IsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsR0FBRyxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2dCQUN0QyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQ2hDLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQ25DLE9BQU8sQ0FDUixDQUFDO2dCQUNGLElBQUksYUFBYSxHQUFHLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQztnQkFDbEMsSUFBSTtvQkFFRixhQUFhLEdBQUcsTUFBTSxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTt3QkFDN0MsSUFBSSxFQUFFLFVBQVU7cUJBQ2pCLENBQWtCLENBQUM7b0JBR3BCLGFBQWEsR0FBRyxNQUFNLFdBQVcsQ0FDL0IsYUFBYSxFQUNiLEdBQUcsRUFDSDt3QkFDRSxJQUFJLEVBQUUsVUFBVTtxQkFDakIsQ0FDZSxDQUFDO29CQUduQixJQUFJLGFBQWEsRUFBRSxLQUFLLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFO3dCQUNyRCxjQUFjLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO3FCQUM1QztvQkFHRCxJQUFJLGFBQWEsQ0FBQyxFQUFFLEtBQUssS0FBSyxFQUFFO3dCQUM5QixjQUFjLENBQUMsSUFBSSxDQUNqQiwrQkFBK0IsRUFDL0IsYUFBYSxDQUNkLENBQUM7cUJBQ0g7b0JBSUQsYUFBYSxHQUFHLE1BQU0sV0FBVyxDQUMvQixhQUFhLEVBQ2I7d0JBQ0UsR0FBRyxHQUFHO3dCQUNOLE1BQU0sRUFBRTs0QkFDTixHQUFHLEdBQUcsQ0FBQyxNQUFNOzRCQUNiLEdBQUcsRUFBRTtnQ0FDSCxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRztnQ0FDakIsR0FBRyxhQUFhLENBQUMsR0FBRzs2QkFDckI7eUJBQ0Y7cUJBQ0YsRUFDRDt3QkFDRSxJQUFJLEVBQUUsaUJBQWlCO3FCQUN4QixDQUNlLENBQUM7b0JBR25CLGFBQWEsR0FBRyxxQkFBcUIsQ0FDbkMsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixhQUFhLENBQ2QsQ0FBQztvQkFDRixPQUFPLEdBQUcsYUFBYSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7b0JBQ3ZDLElBQUksYUFBYSxDQUFDLEVBQUUsS0FBSyxLQUFLLEVBQUU7d0JBQzlCLFNBQVM7cUJBQ1Y7b0JBQ0QsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUscUJBQXFCLENBQUMsQ0FBQztvQkFFL0MsR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsRUFBRTt3QkFDdkIsUUFBUSxFQUFFLGNBQWM7d0JBQ3hCLEdBQUcsYUFBYTtxQkFDakIsQ0FBQyxDQUFDO29CQUNILElBQ0UsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzt3QkFDaEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFDcEQ7d0JBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFOzRCQUMxRCxPQUFPLENBQUMsQ0FBQyxDQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUNyRCxDQUFDLENBQUMsQ0FBQzt3QkFDSCxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztxQkFDdEM7eUJBQU0sSUFBSSxhQUFhLENBQUMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUU7d0JBRWpELGNBQWMsQ0FBQyxLQUFLLENBQ2xCLDZCQUE2QixDQUM5QixDQUFDO3dCQUVGLE1BQU0sSUFBSSxLQUFLLENBQ2Isb0hBQW9ILENBQ3JILENBQUM7cUJBQ0g7b0JBRUQsSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFO3dCQUNyQixhQUFhLEdBQUcsTUFBTSxXQUFXLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTs0QkFDcEQsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO3lCQUNkLENBQWtCLENBQUM7d0JBQ3BCLE1BQU0sU0FBUyxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsR0FBYSxDQUFDLENBQUM7d0JBQ2pFLEdBQUcsR0FBRyxjQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDN0M7b0JBQ0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUV6QyxhQUFhLEdBQUcsTUFBTSxXQUFXLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTt3QkFDcEQsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDO3FCQUNoQixDQUFrQixDQUFDO29CQUVwQixHQUFHLEdBQUcsY0FBYyxDQUFDLEdBQUcsRUFBRTt3QkFDeEIsR0FBRyxhQUFhO3dCQUNoQixRQUFRLEVBQUUsY0FBYztxQkFDekIsQ0FBQyxDQUFDO29CQUdILElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRTt3QkFDeEIsR0FBRyxHQUFHLE1BQU0sU0FBUyxDQUFDLEdBQUcsRUFBRTs0QkFDekIsUUFBUSxFQUFFLGNBQWM7NEJBQ3hCLEdBQUcsYUFBYTt5QkFDakIsQ0FBQyxDQUFDO3FCQUNKO29CQUlELElBQUksYUFBYSxDQUFDLElBQUksRUFBRTt3QkFDdEIsTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFOzRCQUNqQixRQUFRLEVBQUUsY0FBYzs0QkFDeEIsR0FBRyxhQUFhO3lCQUNqQixDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsR0FBRyxHQUFHLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzdCLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFFekMsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFO3dCQUMxQixHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7d0JBQ3JCLGNBQWMsQ0FBQyxPQUFPLENBQ3BCLHNCQUFzQixDQUN2QixDQUFDO3dCQUNGLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzFCLGNBQWMsQ0FBQyxPQUFPLENBQ3BCLHFEQUFxRCxDQUN0RCxDQUFDO3dCQUNGLE1BQU07cUJBQ1A7eUJBQU07d0JBQ0wsY0FBYyxDQUFDLEtBQUssQ0FDbEIsc0JBQXNCLENBQ3ZCLENBQUM7d0JBQ0YsTUFBTSxDQUFDLENBQUM7cUJBQ1Q7aUJBQ0Y7Z0JBQ0QsY0FBYyxDQUFDLElBQUksQ0FDakIsU0FBUyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLFFBQVEsRUFDeEMsc0JBQXNCLENBQ3ZCLENBQUM7Z0JBSUYsYUFBYSxHQUFHLE1BQU0sV0FBVyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7b0JBQ3BELElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztpQkFDaEIsQ0FBa0IsQ0FBQztnQkFDcEIsSUFBSSxhQUFhLENBQUMsS0FBSyxJQUFJLGFBQWEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFO29CQUNsRCxjQUFjLENBQUMsSUFBSSxDQUNqQixHQUFHLGFBQWEsQ0FBQyxLQUFLLFVBQVUsRUFDaEMsT0FBTyxDQUNSLENBQUM7b0JBQ0YsTUFBTSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztpQkFDekM7YUFDRjtZQUVELEdBQUcsQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUVwQyxLQUNFLElBQUksS0FBSyxHQUFHLENBQUMsRUFDYixLQUFLLEdBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFtQixDQUFDLE1BQU0sRUFDOUMsS0FBSyxFQUFFLEVBQ1A7Z0JBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUM3QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksR0FBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXpELElBQ0csR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUErQjtvQkFDMUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUErQixDQUFDLGNBQWMsQ0FBQyxFQUMzRDtvQkFDQSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU87d0JBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUErQixDQUFDLGNBQWMsQ0FBQyxDQUFDO2lCQUMvRDtxQkFBTSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNwQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7b0JBQy9CLGdCQUFnQixDQUFDLE9BQU8sQ0FDdEIsMlNBQTJTLENBQzVTLENBQUM7aUJBQ0g7cUJBQU07b0JBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO2lCQUNoQztnQkFFRCxJQUNHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBK0I7b0JBQzFDLENBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUErQixDQUN6QyxzQkFBc0IsQ0FDdkIsQ0FBWSxJQUFJLENBQUMsRUFDcEI7b0JBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlO3dCQUN4QixDQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBK0IsQ0FDMUMsc0JBQXNCLENBQ3ZCLENBQVcsQ0FBQztvQkFDZixHQUFHLENBQUMsaUJBQWlCO3dCQUNuQixHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQ2xEO3FCQUFNLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3BDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7b0JBQ2xDLGdCQUFnQixDQUFDLE9BQU8sQ0FDdEIsME9BQTBPLENBQzNPLENBQUM7aUJBQ0g7cUJBQU07b0JBQ0wsR0FBRyxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztpQkFDbkM7Z0JBRUQsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUM5QixHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLEVBQUUsRUFDMUMsT0FBTyxDQUNSLENBQUM7Z0JBQ0YsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUU7b0JBQzdCLFlBQVksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7aUJBQzFDO2dCQUVELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO29CQUNuQixRQUFRLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztpQkFDckI7cUJBQU07b0JBQ0wsWUFBWSxDQUFDLElBQUksQ0FDZixFQUFFLEVBQ0YsaUJBQWlCLENBQ2xCLENBQUM7b0JBQ0YsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDbkU7Z0JBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUM5QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMvQixHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7b0JBQ3pCLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FDOUIsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFDekQsT0FBTyxDQUNSLENBQUM7b0JBQ0YsSUFBSSxXQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDO29CQUM5QixJQUFJO3dCQUVGLFdBQVcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFOzRCQUNoRCxJQUFJLEVBQUUsVUFBVTt5QkFDakIsQ0FBZ0IsQ0FBQzt3QkFHbEIsV0FBVyxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7NEJBQ2hELElBQUksRUFBRSxVQUFVO3lCQUNqQixDQUFnQixDQUFDO3dCQUNsQixJQUFJLFdBQVcsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFOzRCQUNsRCxZQUFZLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO3lCQUMxQzt3QkFDRCxJQUFJLFdBQVcsQ0FBQyxFQUFFLEtBQUssS0FBSyxFQUFFOzRCQUM1QixZQUFZLENBQUMsSUFBSSxDQUNmLCtCQUErQixFQUMvQixXQUFXLENBQ1osQ0FBQzt5QkFDSDt3QkFHRCxXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxFQUFFOzRCQUMzQyxHQUFHLEdBQUc7NEJBQ04sTUFBTSxFQUFFO2dDQUNOLEdBQUcsR0FBRyxDQUFDLE1BQU07Z0NBQ2IsR0FBRyxFQUFFO29DQUNILEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHO29DQUNqQixHQUFHLFdBQVcsQ0FBQyxHQUFHO2lDQUNuQjs2QkFDRjt5QkFDRixFQUFFOzRCQUNELElBQUksRUFBRSxpQkFBaUI7eUJBQ3hCLENBQWdCLENBQUM7d0JBRWxCLFdBQVcsR0FBRyxxQkFBcUIsQ0FDakMsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixXQUFXLENBQ1osQ0FBQzt3QkFDRixPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7d0JBRXJDLFlBQVksQ0FBQyxLQUFLLENBQ2hCLHNCQUFzQixDQUN2QixDQUFDO3dCQUdGLElBQUksV0FBVyxDQUFDLEVBQUUsS0FBSyxLQUFLLEVBQUU7NEJBQzVCLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQzs0QkFDOUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDOzRCQUNyQixHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7NEJBQzdCLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQzs0QkFDakMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDOzRCQUMvQixHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7NEJBQ3hCLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzs0QkFDM0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUMzQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0NBQ1gsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUNqRDs0QkFDRCxTQUFTO3lCQUNWO3dCQUVELEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLEVBQUU7NEJBQ3ZCLEdBQUcsV0FBVzs0QkFDZCxRQUFRLEVBQUUsWUFBWTt5QkFDdkIsQ0FBQyxDQUFDO3dCQUNILElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTs0QkFHbkIsV0FBVyxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsRUFBRTtnQ0FDM0MsR0FBRyxHQUFHO2dDQUNOLE1BQU0sRUFBRTtvQ0FDTixHQUFHLEdBQUcsQ0FBQyxNQUFNO29DQUNiLEdBQUcsRUFBRTt3Q0FDSCxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRzt3Q0FDakIsR0FBRyxXQUFXLENBQUMsR0FBRztxQ0FDbkI7aUNBQ0Y7NkJBQ0YsRUFBRTtnQ0FDRCxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7NkJBQ2QsQ0FBZ0IsQ0FBQzs0QkFDbEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxNQUFNLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxHQUFhLENBQUMsQ0FBQzs0QkFDL0QsR0FBRyxHQUFHLGNBQWMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3lCQUM3Qzt3QkFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQzNDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRTs0QkFDWCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ2pEO3dCQUVELFlBQVksQ0FBQyxLQUFLLENBQ2hCLDBCQUEwQixDQUMzQixDQUFDO3FCQUNIO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNWLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFFM0MsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFOzRCQUNYLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDakQ7d0JBQ0QsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFOzRCQUN4QixHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7NEJBQ3JCLFlBQVksQ0FBQyxPQUFPLENBQ2xCLG9CQUFvQixDQUNyQixDQUFDOzRCQUNGLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3hCLFlBQVksQ0FBQyxPQUFPLENBQ2xCLHFEQUFxRCxDQUN0RCxDQUFDOzRCQUNGLE1BQU07eUJBQ1A7NkJBQU07NEJBQ0wsWUFBWSxDQUFDLEtBQUssQ0FDaEIsb0JBQW9CLENBQ3JCLENBQUM7NEJBQ0YsTUFBTSxDQUFDLENBQUM7eUJBQ1Q7cUJBQ0Y7b0JBSUQsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFO3dCQUN0QixNQUFNLFNBQVMsQ0FBQyxHQUFHLEVBQUU7NEJBQ25CLFFBQVEsRUFBRSxZQUFZOzRCQUN0QixHQUFHLFdBQVc7eUJBQ2YsQ0FBQyxDQUFDO3FCQUNKO29CQUVELElBQUksV0FBVyxDQUFDLElBQUksRUFBRTt3QkFDcEIsTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFOzRCQUNqQixRQUFRLEVBQUUsWUFBWTs0QkFDdEIsR0FBRyxXQUFXO3lCQUNmLENBQUMsQ0FBQztxQkFDSjtvQkFDRCxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxrQkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFHOUMsV0FBVyxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7d0JBQ2hELElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztxQkFDaEIsQ0FBZ0IsQ0FBQztvQkFHbEIsSUFBSSxXQUFXLENBQUMsS0FBSyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFO3dCQUM5QyxZQUFZLENBQUMsSUFBSSxDQUNmLEdBQUcsV0FBVyxDQUFDLEtBQUssVUFBVSxFQUM5QixPQUFPLENBQ1IsQ0FBQzt3QkFDRixNQUFNLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO3FCQUN2QztpQkFDRjtnQkFHRCxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUU7b0JBQ3pELElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUU7d0JBQ2pELEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztxQkFDOUI7b0JBQ0QsSUFDRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU87d0JBQ2xCLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFDLEVBQ3REO3dCQUNBLEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQVEsQ0FBQyxDQUFDO3FCQUN0RDtvQkFFRCxJQUFJLEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUU7d0JBQ3pDLEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7cUJBQ2xFO2lCQUNGO2dCQUNELElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUM3QixZQUFZLENBQUMsSUFBSSxDQUNmLEVBQUUsRUFDRixrQkFBa0IsQ0FDbkIsQ0FBQztpQkFDSDthQUNGO1lBR0QsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUMzQixJQUFJLElBQUksRUFBRTtnQkFDUixNQUFNLFlBQVksR0FBRyxXQUFXLENBQzlCLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQ2pDLE9BQU8sQ0FDUixDQUFDO2dCQUNGLElBQUksV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQztnQkFDOUIsSUFBSTtvQkFFRixXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTt3QkFDaEQsSUFBSSxFQUFFLFVBQVU7cUJBQ2pCLENBQWdCLENBQUM7b0JBR2xCLFdBQVcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO3dCQUNoRCxJQUFJLEVBQUUsVUFBVTtxQkFDakIsQ0FBZ0IsQ0FBQztvQkFDbEIsSUFBSSxXQUFXLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRTt3QkFDbEQsWUFBWSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztxQkFDMUM7b0JBQ0QsSUFBSSxXQUFXLENBQUMsRUFBRSxLQUFLLEtBQUssRUFBRTt3QkFDNUIsWUFBWSxDQUFDLElBQUksQ0FDZiwrQkFBK0IsRUFDL0IsV0FBVyxDQUNaLENBQUM7d0JBQ0YsU0FBUztxQkFDVjtvQkFHRCxXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxFQUFFO3dCQUMzQyxHQUFHLEdBQUc7d0JBQ04sTUFBTSxFQUFFOzRCQUNOLEdBQUcsR0FBRyxDQUFDLE1BQU07NEJBQ2IsR0FBRyxFQUFFO2dDQUNILEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHO2dDQUNqQixHQUFHLFdBQVcsQ0FBQyxHQUFHOzZCQUNuQjt5QkFDRjtxQkFDRixFQUFFO3dCQUNELElBQUksRUFBRSxpQkFBaUI7cUJBQ3hCLENBQWdCLENBQUM7b0JBRWxCLFdBQVcsR0FBRyxxQkFBcUIsQ0FDakMsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixXQUFXLENBQ1osQ0FBQztvQkFDRixPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7b0JBRXJDLFlBQVksQ0FBQyxJQUFJLENBQ2YsaUJBQWlCLENBQ2xCLENBQUM7b0JBR0YsR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsRUFBRTt3QkFDdkIsR0FBRyxXQUFXO3dCQUNkLFFBQVEsRUFBRSxZQUFZO3FCQUN2QixDQUFDLENBQUM7b0JBQ0gsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFO3dCQUVuQixXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTs0QkFDaEQsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO3lCQUNkLENBQWdCLENBQUM7d0JBQ2xCLE1BQU0sU0FBUyxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsR0FBYSxDQUFDLENBQUM7d0JBQy9ELEdBQUcsR0FBRyxjQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDN0M7b0JBRUQsWUFBWSxDQUFDLEtBQUssQ0FDaEIscUJBQXFCLENBQ3RCLENBQUM7aUJBQ0g7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFO3dCQUN4QixHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7d0JBQ3JCLFlBQVksQ0FBQyxPQUFPLENBQ2xCLG9CQUFvQixDQUNyQixDQUFDO3dCQUNGLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3hCLFlBQVksQ0FBQyxPQUFPLENBQ2xCLHFEQUFxRCxDQUN0RCxDQUFDO3dCQUNGLE1BQU07cUJBQ1A7eUJBQU07d0JBQ0wsWUFBWSxDQUFDLEtBQUssQ0FDaEIsb0JBQW9CLENBQ3JCLENBQUM7d0JBQ0YsTUFBTSxDQUFDLENBQUM7cUJBQ1Q7aUJBQ0Y7Z0JBSUQsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFO29CQUN0QixNQUFNLFNBQVMsQ0FBQyxHQUFHLEVBQUU7d0JBQ25CLFFBQVEsRUFBRSxZQUFZO3dCQUN0QixHQUFHLFdBQVc7cUJBQ2YsQ0FBQyxDQUFDO2lCQUNKO2dCQUVELElBQUksV0FBVyxDQUFDLElBQUksRUFBRTtvQkFDcEIsTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUNqQixRQUFRLEVBQUUsWUFBWTt3QkFDdEIsR0FBRyxXQUFXO3FCQUNmLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUcxQyxXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtvQkFDaEQsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDO2lCQUNoQixDQUFnQixDQUFDO2dCQUVsQixJQUFJLFdBQVcsQ0FBQyxLQUFLLElBQUksV0FBVyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUU7b0JBQzlDLFlBQVksQ0FBQyxJQUFJLENBQ2YsR0FBRyxXQUFXLENBQUMsS0FBSyxVQUFVLEVBQzlCLE9BQU8sQ0FDUixDQUFDO29CQUNGLE1BQU0sS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7aUJBQ3ZDO2FBQ0Y7WUFJRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFHdEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUMvRCxJQUFJLFlBQVksS0FBSyxHQUFHLENBQUMsU0FBUyxFQUFFO2dCQUNsQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sR0FBRyxDQUFDLEVBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUM7aUJBQU07YUFFTjtZQUNELElBQUksb0JBQW9CLEtBQUssR0FBRyxDQUFDLGlCQUFpQixFQUFFO2dCQUNsRCxnQkFBZ0IsQ0FBQyxLQUFLLENBQ3BCLHFCQUFxQixDQUN0QixDQUFDO2dCQUNGLE1BQU0sR0FBRyxDQUFDLEVBQUcsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUN2RDtpQkFBTTthQUlOO1lBQ0QsZ0JBQWdCLENBQUMsSUFBSSxDQUNuQixFQUFFLEVBQ0YsaUJBQWlCLENBQ2xCLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsZ0JBQWdCLENBQUMsS0FBSyxDQUNwQiw2QkFBNkIsQ0FDOUIsQ0FBQztZQUVGLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsYUFBYSxHQUFHLENBQUMsRUFBRTtnQkFDN0MsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDVixHQUFHO2dCQUNILEtBQUssRUFBRSxDQUFDO2FBQ1QsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ25CO0lBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsT0FBTyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FDcEQsQ0FBQztZQUNGLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0tBQzVDO0FBQ0gsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEdBQVk7SUFDbkMsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztJQUNyRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUM3QyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDakMsT0FBTyxZQUFZLENBQUM7S0FDckI7U0FBTTtRQUNMLE9BQU8sWUFBWSxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEZpbHRlck9wdGlvbnMsXG4gIFJ1bldvcmtmbG93T3B0aW9ucyxcbiAgU291cmNlT3B0aW9ucyxcbiAgU3RlcE9wdGlvbnMsXG4gIFdvcmtmbG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBoYXNQZXJtaXNzaW9uU2xpZW50IH0gZnJvbSBcIi4vcGVybWlzc2lvbi50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCwgU3RlcFR5cGUgfSBmcm9tIFwiLi9pbnRlcm5hbC1pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IHBhcnNlV29ya2Zsb3cgfSBmcm9tIFwiLi9wYXJzZS13b3JrZmxvdy50c1wiO1xuaW1wb3J0IHsgZ2V0Q29udGVudCB9IGZyb20gXCIuL3V0aWxzL2ZpbGUudHNcIjtcbmltcG9ydCB7IGdldEZpbGVzQnlGaWx0ZXIgfSBmcm9tIFwiLi91dGlscy9maWx0ZXIudHNcIjtcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSBcIi4vdXRpbHMvb2JqZWN0LnRzXCI7XG5pbXBvcnQgeyBwYXJzZU9iamVjdCB9IGZyb20gXCIuL3BhcnNlLW9iamVjdC50c1wiO1xuaW1wb3J0IHsgaXNSZW1vdGVQYXRoIH0gZnJvbSBcIi4vdXRpbHMvcGF0aC50c1wiO1xuaW1wb3J0IHsgZ2V0U3RlcFJlc3BvbnNlLCBydW5TdGVwLCBzZXRFcnJvclJlc3VsdCB9IGZyb20gXCIuL3J1bi1zdGVwLnRzXCI7XG5pbXBvcnQge1xuICBmaWx0ZXJDdHhJdGVtcyxcbiAgZ2V0U291cmNlSXRlbXNGcm9tUmVzdWx0LFxufSBmcm9tIFwiLi9nZXQtc291cmNlLWl0ZW1zLWZyb20tcmVzdWx0LnRzXCI7XG5pbXBvcnQge1xuICBjb25maWcsXG4gIGRlbGF5LFxuICBkaXJuYW1lLFxuICBqb2luLFxuICBsb2csXG4gIHJlbGF0aXZlLFxuICBTcWxpdGVEYixcbn0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCByZXBvcnQsIHsgZ2V0UmVwb3J0ZXIgfSBmcm9tIFwiLi9yZXBvcnQudHNcIjtcbmltcG9ydCB7IEtleWRiIH0gZnJvbSBcIi4vYWRhcHRlcnMvanNvbi1zdG9yZS1hZGFwdGVyLnRzXCI7XG5pbXBvcnQgeyBmaWx0ZXJTb3VyY2VJdGVtcyB9IGZyb20gXCIuL2ZpbHRlci1zb3VyY2UtaXRlbXMudHNcIjtcbmltcG9ydCB7IG1hcmtTb3VyY2VJdGVtcyB9IGZyb20gXCIuL21hcmstc291cmNlLWl0ZW1zLnRzXCI7XG5pbXBvcnQgeyBydW5DbWQsIHNldENtZE9rUmVzdWx0IH0gZnJvbSBcIi4vcnVuLWNtZC50c1wiO1xuaW1wb3J0IHtcbiAgZ2V0RmluYWxSdW5PcHRpb25zLFxuICBnZXRGaW5hbFNvdXJjZU9wdGlvbnMsXG4gIGdldEZpbmFsV29ya2Zsb3dPcHRpb25zLFxufSBmcm9tIFwiLi9kZWZhdWx0LW9wdGlvbnMudHNcIjtcbmltcG9ydCB7IHJ1blBvc3QgfSBmcm9tIFwiLi9ydW4tcG9zdC50c1wiO1xuaW1wb3J0IHsgcnVuQXNzZXJ0IH0gZnJvbSBcIi4vcnVuLWFzc2VydC50c1wiO1xuXG5pbnRlcmZhY2UgVmFsaWRXb3JrZmxvdyB7XG4gIGN0eDogQ29udGV4dDtcbiAgd29ya2Zsb3c6IFdvcmtmbG93T3B0aW9ucztcbn1cblxuY29uc3QgcGFyc2UxS2V5cyA9IFtcImVudlwiXTtcbmNvbnN0IHBhcnNlMktleXMgPSBbXCJpZlwiLCBcImRlYnVnXCJdO1xuY29uc3QgcGFyc2UzRm9yR2VuZXJhbEtleXMgPSBbXG4gIFwiaWZcIixcbiAgXCJkZWJ1Z1wiLFxuICBcImRhdGFiYXNlXCIsXG4gIFwic2xlZXBcIixcbiAgXCJsaW1pdFwiLFxuICBcImZvcmNlXCIsXG5dO1xuY29uc3QgcGFyc2UzRm9yU3RlcEtleXMgPSBbXG4gIFwiaWRcIixcbiAgXCJmcm9tXCIsXG4gIFwidXNlXCIsXG4gIFwiYXJnc1wiLFxuXTtcbmNvbnN0IHBhcnNlNEZvclNvdXJjZUtleXMgPSBbXG4gIFwiZm9yY2VcIixcbiAgXCJpdGVtc1BhdGhcIixcbiAgXCJrZXlcIixcbl07XG5cbmNvbnN0IHBhcnNlNkZvclNvdXJjZUtleXMgPSBbXG4gIFwibGltaXRcIixcbiAgXCJmaWx0ZXJGcm9tXCIsXG4gIFwiZmlsdGVySXRlbXNGcm9tXCIsXG5dO1xuY29uc3QgcGFyc2U3Rm9yU291cmNlS2V5cyA9IFtcbiAgXCJjbWRcIixcbl07XG5jb25zdCBwYXJzZThGb3JTb3VyY2VLZXlzID0gW1xuICBcImxpbWl0XCIsXG5dO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuKHJ1bk9wdGlvbnM6IFJ1bldvcmtmbG93T3B0aW9ucykge1xuICBjb25zdCBkZWJ1Z0VudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBcIkRFQlVHXCIgfSBhcyBjb25zdDtcbiAgY29uc3QgZGF0YVBlcm1pc3Npb24gPSB7IG5hbWU6IFwicmVhZFwiLCBwYXRoOiBcImRhdGFcIiB9IGFzIGNvbnN0O1xuICBsZXQgRGVidWdFbnZWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgIERlYnVnRW52VmFsdWUgPSBEZW5vLmVudi5nZXQoXCJERUJVR1wiKTtcbiAgfVxuICBsZXQgaXNEZWJ1ZyA9ICEhKERlYnVnRW52VmFsdWUgIT09IHVuZGVmaW5lZCAmJiBEZWJ1Z0VudlZhbHVlICE9PSBcImZhbHNlXCIpO1xuXG4gIGNvbnN0IGNsaVdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsUnVuT3B0aW9ucyhydW5PcHRpb25zLCBpc0RlYnVnKTtcbiAgaXNEZWJ1ZyA9IGNsaVdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcbiAgY29uc3Qge1xuICAgIGZpbGVzLFxuICAgIGNvbnRlbnQsXG4gIH0gPSBjbGlXb3JrZmxvd09wdGlvbnM7XG4gIGxldCB3b3JrZmxvd0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBjd2QgPSBEZW5vLmN3ZCgpO1xuICBpZiAoY29udGVudCkge1xuICAgIHdvcmtmbG93RmlsZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICB3b3JrZmxvd0ZpbGVzID0gYXdhaXQgZ2V0RmlsZXNCeUZpbHRlcihjd2QsIGZpbGVzKTtcbiAgfVxuXG4gIGxldCBlbnYgPSB7fTtcblxuICBjb25zdCBhbGxFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiIH0gYXMgY29uc3Q7XG5cbiAgLy8gZmlyc3QgdHJ5IHRvIGdldCAuZW52XG4gIGNvbnN0IGRvdEVudkZpbGVQZXJtbWlzaW9uID0ge1xuICAgIG5hbWU6IFwicmVhZFwiLFxuICAgIHBhdGg6IFwiLmVudiwuZW52LmRlZmF1bHRzLC5lbnYuZXhhbXBsZVwiLFxuICB9IGFzIGNvbnN0O1xuXG4gIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRvdEVudkZpbGVQZXJtbWlzaW9uKSkge1xuICAgIGVudiA9IGNvbmZpZygpO1xuICB9XG5cbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoYWxsRW52UGVybW1pc2lvbikpIHtcbiAgICBlbnYgPSB7XG4gICAgICAuLi5lbnYsXG4gICAgICAuLi5EZW5vLmVudi50b09iamVjdCgpLFxuICAgIH07XG4gIH1cblxuICAvLyBnZXQgb3B0aW9uc1xuICBsZXQgdmFsaWRXb3JrZmxvd3M6IFZhbGlkV29ya2Zsb3dbXSA9IFtdO1xuXG4gIC8vIGlmIHN0ZGluXG5cbiAgaWYgKGNvbnRlbnQpIHtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHBhcnNlV29ya2Zsb3coY29udGVudCk7XG5cbiAgICBpZiAoaXNPYmplY3Qod29ya2Zsb3cpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvd0ZpbGVQYXRoID0gXCIvdG1wL2Rlbm9mbG93L3RtcC13b3JrZmxvdy55bWxcIjtcbiAgICAgIGNvbnN0IHdvcmtmbG93UmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoY3dkLCB3b3JrZmxvd0ZpbGVQYXRoKTtcbiAgICAgIHZhbGlkV29ya2Zsb3dzLnB1c2goe1xuICAgICAgICBjdHg6IHtcbiAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgIGVudixcbiAgICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICAgIHdvcmtmbG93UmVsYXRpdmVQYXRoLFxuICAgICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgICBjd2Q6IGN3ZCxcbiAgICAgICAgICAgIHNvdXJjZXM6IHt9LFxuICAgICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGl0ZW1Tb3VyY2VPcHRpb25zOiB1bmRlZmluZWQsXG4gICAgICAgICAgc291cmNlc09wdGlvbnM6IFtdLFxuICAgICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgICB9LFxuICAgICAgICB3b3JrZmxvdzogd29ya2Zsb3csXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrZmxvd0ZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgd29ya2Zsb3dSZWxhdGl2ZVBhdGggPSB3b3JrZmxvd0ZpbGVzW2ldO1xuICAgIGxldCBmaWxlQ29udGVudCA9IFwiXCI7XG4gICAgbGV0IHdvcmtmbG93RmlsZVBhdGggPSBcIlwiO1xuICAgIGlmIChpc1JlbW90ZVBhdGgod29ya2Zsb3dSZWxhdGl2ZVBhdGgpKSB7XG4gICAgICBjb25zdCBuZXRDb250ZW50ID0gYXdhaXQgZmV0Y2god29ya2Zsb3dSZWxhdGl2ZVBhdGgpO1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IHdvcmtmbG93UmVsYXRpdmVQYXRoO1xuICAgICAgZmlsZUNvbnRlbnQgPSBhd2FpdCBuZXRDb250ZW50LnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IGpvaW4oY3dkLCB3b3JrZmxvd1JlbGF0aXZlUGF0aCk7XG4gICAgICBmaWxlQ29udGVudCA9IGF3YWl0IGdldENvbnRlbnQod29ya2Zsb3dGaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBwYXJzZVdvcmtmbG93KGZpbGVDb250ZW50KTtcbiAgICBpZiAoIWlzT2JqZWN0KHdvcmtmbG93KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFsaWRXb3JrZmxvd3MucHVzaCh7XG4gICAgICBjdHg6IHtcbiAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgZW52LFxuICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICB3b3JrZmxvd1JlbGF0aXZlUGF0aDogd29ya2Zsb3dSZWxhdGl2ZVBhdGgsXG4gICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgY3dkOiBjd2QsXG4gICAgICAgICAgc291cmNlczoge30sXG4gICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgIHN0YXRlOiB1bmRlZmluZWQsXG4gICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBpdGVtU291cmNlT3B0aW9uczogdW5kZWZpbmVkLFxuICAgICAgICBzb3VyY2VzT3B0aW9uczogW10sXG4gICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgfSxcbiAgICAgIHdvcmtmbG93OiB3b3JrZmxvdyxcbiAgICB9KTtcbiAgICAvLyBydW4gY29kZVxuICB9XG4gIC8vIHNvcnQgYnkgYWxwaGFiZXRcbiAgdmFsaWRXb3JrZmxvd3MgPSB2YWxpZFdvcmtmbG93cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgYVBhdGggPSBhLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgY29uc3QgYlBhdGggPSBiLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgaWYgKGFQYXRoIDwgYlBhdGgpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgaWYgKGFQYXRoID4gYlBhdGgpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG4gIHJlcG9ydC5pbmZvKFxuICAgIGAgJHt2YWxpZFdvcmtmbG93cy5sZW5ndGh9IHZhbGlkIHdvcmtmbG93czpcXG4ke1xuICAgICAgdmFsaWRXb3JrZmxvd3MubWFwKChpdGVtKSA9PiBnZXRSZXBvcnRlck5hbWUoaXRlbS5jdHgpKS5qb2luKFxuICAgICAgICBcIlxcblwiLFxuICAgICAgKVxuICAgIH1cXG5gLFxuICAgIFwiU3VjY2VzcyBmb3VuZFwiLFxuICApO1xuICAvLyBydW4gd29ya2Zsb3dzIHN0ZXAgYnkgc3RlcFxuICBmb3IgKFxuICAgIGxldCB3b3JrZmxvd0luZGV4ID0gMDtcbiAgICB3b3JrZmxvd0luZGV4IDwgdmFsaWRXb3JrZmxvd3MubGVuZ3RoO1xuICAgIHdvcmtmbG93SW5kZXgrK1xuICApIHtcbiAgICBsZXQgeyBjdHgsIHdvcmtmbG93IH0gPSB2YWxpZFdvcmtmbG93c1t3b3JrZmxvd0luZGV4XTtcbiAgICAvLyBwYXJzZSByb290IGVudiBmaXJzdFxuICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52ID0gYXdhaXQgcGFyc2VPYmplY3Qod29ya2Zsb3csIGN0eCwge1xuICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICB9KSBhcyBXb3JrZmxvd09wdGlvbnM7XG4gICAgLy8gcnVuIGVudlxuICAgIC8vIHBhcnNlIGVudiB0byBlbnZcbiAgICBpZiAocGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYuZW52KSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnYpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnZba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGNvbnN0IGRlYnVnRW52UGVybW1pc2lvbiA9IHsgbmFtZTogXCJlbnZcIiwgdmFyaWFibGU6IGtleSB9IGFzIGNvbnN0O1xuICAgICAgICAgIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRlYnVnRW52UGVybW1pc2lvbikpIHtcbiAgICAgICAgICAgIERlbm8uZW52LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwYXJzZSBnZW5lcmFsIG9wdGlvbnNcblxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93R2VuZXJhbE9wdGlvbnNXaXRoR2VuZXJhbCA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgcGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYsXG4gICAgICBjdHgsXG4gICAgICB7XG4gICAgICAgIGtleXM6IHBhcnNlM0ZvckdlbmVyYWxLZXlzLFxuICAgICAgfSxcbiAgICApIGFzIFdvcmtmbG93T3B0aW9ucztcblxuICAgIGNvbnN0IHdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsV29ya2Zsb3dPcHRpb25zKFxuICAgICAgcGFyc2VkV29ya2Zsb3dHZW5lcmFsT3B0aW9uc1dpdGhHZW5lcmFsIHx8XG4gICAgICAgIHt9LFxuICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICk7XG4gICAgaXNEZWJ1ZyA9IHdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgIGNvbnN0IHdvcmtmbG93UmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfWAsXG4gICAgICBpc0RlYnVnLFxuICAgICk7XG5cbiAgICAvLyBjaGVjayBpZiBuZWVkIHRvIHJ1blxuICAgIGlmICh3b3JrZmxvd09wdGlvbnM/LmlmID09PSBmYWxzZSkge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICBcIlNraXAgd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgICBjb250aW51ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYCxcbiAgICAgICAgXCJTdGFydCBoYW5kbGUgd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgdG8gZ2V0IGRlZmF1bHRcbiAgICBjdHgucHVibGljLm9wdGlvbnMgPSB3b3JrZmxvd09wdGlvbnM7XG5cbiAgICBjb25zdCBkYXRhYmFzZSA9IHdvcmtmbG93T3B0aW9ucy5kYXRhYmFzZSBhcyBzdHJpbmc7XG4gICAgbGV0IGRiO1xuICAgIGlmIChkYXRhYmFzZT8uc3RhcnRzV2l0aChcInNxbGl0ZVwiKSkge1xuICAgICAgZGIgPSBuZXcgU3FsaXRlRGIoZGF0YWJhc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbmFtZXNwYWNlID0gY3R4LnB1YmxpYy53b3JrZmxvd1JlbGF0aXZlUGF0aDtcbiAgICAgIGlmIChuYW1lc3BhY2Uuc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgICAgIC8vIHVzZSBhYnNvbHV0ZSBwYXRoIGFzIG5hbWVzcGFjZVxuICAgICAgICBuYW1lc3BhY2UgPSBgQGRlbm9mbG93Um9vdCR7Y3R4LnB1YmxpYy53b3JrZmxvd1BhdGh9YDtcbiAgICAgIH1cbiAgICAgIGRiID0gbmV3IEtleWRiKGRhdGFiYXNlLCB7XG4gICAgICAgIG5hbWVzcGFjZTogbmFtZXNwYWNlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGN0eC5kYiA9IGRiO1xuICAgIC8vIGNoZWNrIHBlcm1pc3Npb25cbiAgICAvLyB1bmlxdWUga2V5XG4gICAgbGV0IHN0YXRlO1xuICAgIGxldCBpbnRlcm5hbFN0YXRlID0ge1xuICAgICAga2V5czogW10sXG4gICAgfTtcbiAgICBpZiAoYXdhaXQgaGFzUGVybWlzc2lvblNsaWVudChkYXRhUGVybWlzc2lvbikpIHtcbiAgICAgIHN0YXRlID0gYXdhaXQgZGIuZ2V0KFwic3RhdGVcIikgfHwgdW5kZWZpbmVkO1xuICAgICAgaW50ZXJuYWxTdGF0ZSA9IGF3YWl0IGRiLmdldChcImludGVybmFsU3RhdGVcIikgfHwge1xuICAgICAgICBrZXlzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzdGF0ZTtcbiAgICBjdHguaW50ZXJuYWxTdGF0ZSA9IGludGVybmFsU3RhdGU7XG4gICAgY3R4LmluaXRTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcbiAgICBjdHguaW5pdEludGVybmFsU3RhdGUgPSBKU09OLnN0cmluZ2lmeShpbnRlcm5hbFN0YXRlKTtcblxuICAgIGNvbnN0IHNvdXJjZXMgPSB3b3JrZmxvdy5zb3VyY2VzO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGdldCBzb3VyY2VzXCIpO1xuICAgICAgICBmb3IgKGxldCBzb3VyY2VJbmRleCA9IDA7IHNvdXJjZUluZGV4IDwgc291cmNlcy5sZW5ndGg7IHNvdXJjZUluZGV4KyspIHtcbiAgICAgICAgICBjb25zdCBzb3VyY2UgPSBzb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ID0gc291cmNlSW5kZXg7XG4gICAgICAgICAgY29uc3Qgc291cmNlUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzb3VyY2U6JHtjdHgucHVibGljLnNvdXJjZUluZGV4fWAsXG4gICAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IHNvdXJjZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAuLi5zb3VyY2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlIGlmIG9ubHlcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgY3R4LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gc2V0IGxvZyBsZXZlbFxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnM/LmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiBuZWVkIHRvIHJ1blxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWYgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgICAgYGJlY2F1c2UgaWYgY29uZGl0aW9uIGlzIGZhbHNlYCxcbiAgICAgICAgICAgICAgICBcIlNraXAgc291cmNlXCIsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcnNlIG9uXG4gICAgICAgICAgICAvLyBpbnNlcnQgc3RlcCBlbnZcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2UzRm9yU3RlcEtleXMsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpc0RlYnVnID0gc291cmNlT3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgICAgLy8gY2hlY2sgaWZcbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZENvZGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmlzUmVhbE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5pZCkge1xuICAgICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VPcHRpb25zLmlkXSA9XG4gICAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcnVuIHNvdXJjZVxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuU3RlcChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlNFxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZU9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTRGb3JTb3VyY2VLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gZ2V0IHNvdXJjZSBpdGVtcyBieSBpdGVtc1BhdGgsIGtleVxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgZ2V0U291cmNlSXRlbXNGcm9tUmVzdWx0KGN0eCwge1xuICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICByZXBvcnRlcjogc291cmNlUmVwb3J0ZXIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIHBhcnNlNSByZXZlcnNlXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IFtcInJldmVyc2VcIl0sXG4gICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5yZXZlcnNlKSB7XG4gICAgICAgICAgICAgIC8vIHJldmVyc2VcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pdGVtcyA9IGN0eC5wdWJsaWMuaXRlbXMucmV2ZXJzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcGFyc2U2XG5cbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2U2Rm9yU291cmNlS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG4gICAgICAgICAgICAvLyBydW4gdXNlciBmaWx0ZXIsIGZpbHRlciBmcm9tLCBmaWx0ZXJJdGVtcywgZmlsdGVySXRlbXNGcm9tLCBvbmx5IGFsbG93IG9uZS5cbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IGZpbHRlclNvdXJjZUl0ZW1zKGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogc291cmNlUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gcnVuIGNtZFxuXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZU9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICAgIGtleXM6IHBhcnNlN0ZvclNvdXJjZUtleXMsXG4gICAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG4gICAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIHNvdXJjZU9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG1hcmsgc291cmNlIGl0ZW1zLCBhZGQgdW5pcXVlIGtleSBhbmQgc291cmNlIGluZGV4IHRvIGl0ZW1zXG4gICAgICAgICAgICBjdHggPSBtYXJrU291cmNlSXRlbXMoY3R4LCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VPcHRpb25zLmlkXSA9XG4gICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuYXNzZXJ0KSB7XG4gICAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgICByZXBvcnRlcjogc291cmNlUmVwb3J0ZXIsXG4gICAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIC8vIHJ1biBwb3N0XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgICAgXCJcIixcbiAgICAgICAgICAgICAgICBgU291cmNlICR7c291cmNlSW5kZXh9IGdldCAke2N0eC5wdWJsaWMuaXRlbXMubGVuZ3RofSBpdGVtc2AsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLnBvc3QpIHtcbiAgICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgICByZXBvcnRlcjogc291cmNlUmVwb3J0ZXIsXG4gICAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdHguc291cmNlc09wdGlvbnMucHVzaChzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjdHggPSBzZXRFcnJvclJlc3VsdChjdHgsIGUpO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZS5pZCkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlLmlkXSA9IGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc291cmNlLmNvbnRpbnVlT25FcnJvcikge1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHJ1biBzb3VyY2VgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgcnVuIHNvdXJjZWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHBhcnNlIDggc2xlZXBcbiAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLnNsZWVwICYmIHNvdXJjZU9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgJHtzb3VyY2VPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KHNvdXJjZU9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaW5zZXJ0IG5ldyBjdHguaXRlbXNcbiAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgIGxldCBjb2xsZWN0Q3R4SXRlbXM6IHVua25vd25bXSA9IFtdO1xuICAgICAgICBzb3VyY2VzLmZvckVhY2goKF8sIHRoZVNvdXJjZUluZGV4KSA9PiB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5zb3VyY2VzW3RoZVNvdXJjZUluZGV4XS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBjb2xsZWN0Q3R4SXRlbXMgPSBjb2xsZWN0Q3R4SXRlbXMuY29uY2F0KFxuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbdGhlU291cmNlSW5kZXhdLnJlc3VsdCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY3R4LnB1YmxpYy5pdGVtcyA9IGNvbGxlY3RDdHhJdGVtcztcbiAgICAgICAgaWYgKGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBUb3RhbCAke2N0eC5wdWJsaWMuaXRlbXMubGVuZ3RofSBpdGVtc2AsXG4gICAgICAgICAgICBcIkZpbmlzaCBnZXQgc291cmNlc1wiLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgaXRlbXMgPjAsIHRoZW4gY29udGludWVcbiAgICAgIGlmICgoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBubyBuZWVkIHRvIGhhbmRsZSBzdGVwc1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgICAgYGJlY2F1c2Ugbm8gYW55IHZhbGlkIHNvdXJjZXMgaXRlbXMgcmV0dXJuZWRgLFxuICAgICAgICAgIFwiU2tpcCB3b3JrZmxvd1wiLFxuICAgICAgICApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gcnVuIGZpbHRlclxuICAgICAgY29uc3QgZmlsdGVyID0gd29ya2Zsb3cuZmlsdGVyO1xuICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICBjdHguY3VycmVudFN0ZXBUeXBlID0gU3RlcFR5cGUuRmlsdGVyO1xuICAgICAgICBjb25zdCBmaWx0ZXJSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBmaWx0ZXJgLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGxldCBmaWx0ZXJPcHRpb25zID0geyAuLi5maWx0ZXIgfTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBwYXJzZSBlbnYgZmlyc3RcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IHBhcnNlMUtleXMsXG4gICAgICAgICAgfSkgYXMgRmlsdGVyT3B0aW9ucztcblxuICAgICAgICAgIC8vIHBhcnNlIGlmIGRlYnVnIG9ubHlcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgY3R4LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTJLZXlzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICApIGFzIEZpbHRlck9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBzZXQgbG9nIGxldmVsXG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnM/LmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBjaGVjayBpZiBuZWVkIHRvIHJ1blxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYGJlY2F1c2UgaWYgY29uZGl0aW9uIGlzIGZhbHNlYCxcbiAgICAgICAgICAgICAgXCJTa2lwIGZpbHRlclwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlM0ZvclN0ZXBLZXlzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICApIGFzIEZpbHRlck9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXNEZWJ1ZyA9IGZpbHRlck9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMuaWYgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGhhbmRsZSBmaWx0ZXJcIik7XG4gICAgICAgICAgLy8gcnVuIEZpbHRlclxuICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5yZXN1bHQpICYmXG4gICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdC5sZW5ndGggPT09IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLml0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcy5maWx0ZXIoKF9pdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gISEoKGN0eC5wdWJsaWMucmVzdWx0IGFzIGJvb2xlYW5bXSlbaW5kZXhdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSBjdHgucHVibGljLml0ZW1zO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyT3B0aW9ucy5ydW4gfHwgZmlsdGVyT3B0aW9ucy51c2UpIHtcbiAgICAgICAgICAgIC8vIGlmIHJ1biBvciB1c2UsIHRoZW4gcmVzdWx0IG11c3QgYmUgYXJyYXlcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXIgc2NyaXB0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3VsdFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIkludmFsaWQgZmlsdGVyIHN0ZXAgcmVzdWx0LCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggYXJyYXkgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChmaWx0ZXJPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgfSkgYXMgRmlsdGVyT3B0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIGZpbHRlck9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdHgucHVibGljLmZpbHRlciA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgIC8vIHBhcnNlIGxpbWl0XG4gICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlck9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogW1wibGltaXRcIl0sXG4gICAgICAgICAgfSkgYXMgRmlsdGVyT3B0aW9ucztcbiAgICAgICAgICAvLyBydW4gZmlsdGVyXG4gICAgICAgICAgY3R4ID0gZmlsdGVyQ3R4SXRlbXMoY3R4LCB7XG4gICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBydW4gcG9zdFxuXG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY3R4ID0gc2V0RXJyb3JSZXN1bHQoY3R4LCBlKTtcbiAgICAgICAgICBjdHgucHVibGljLmZpbHRlciA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuXG4gICAgICAgICAgaWYgKGZpbHRlci5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgYFRvdGFsICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICBcIkZpbmlzaCBoYW5kbGUgZmlsdGVyXCIsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICAvLyBwYXJzZSBzbGVlcFxuICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAga2V5czogW1wic2xlZXBcIl0sXG4gICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG4gICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLnNsZWVwICYmIGZpbHRlck9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGAke2ZpbHRlck9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYXdhaXQgZGVsYXkoZmlsdGVyT3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGN0eC5jdXJyZW50U3RlcFR5cGUgPSBTdGVwVHlwZS5TdGVwO1xuXG4gICAgICBmb3IgKFxuICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgICBpbmRleCA8IChjdHgucHVibGljLml0ZW1zIGFzIHVua25vd25bXSkubGVuZ3RoO1xuICAgICAgICBpbmRleCsrXG4gICAgICApIHtcbiAgICAgICAgY3R4LnB1YmxpYy5pdGVtSW5kZXggPSBpbmRleDtcbiAgICAgICAgY3R4LnB1YmxpYy5pdGVtID0gKGN0eC5wdWJsaWMuaXRlbXMgYXMgdW5rbm93bltdKVtpbmRleF07XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPikgJiZcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pW1wiQGRlbm9mbG93S2V5XCJdXG4gICAgICAgICkge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSA9XG4gICAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pW1wiQGRlbm9mbG93S2V5XCJdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGN0eC5wdWJsaWMuaXRlbSkpIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgd29ya2Zsb3dSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgYENhbiBub3QgZm91bmQgaW50ZXJuYWwgaXRlbSBrZXkgXFxgQGRlbm9mbG93S2V5XFxgLCBtYXliZSB5b3UgY2hhbmdlZCB0aGUgaXRlbSBmb3JtYXQuIE1pc3NpbmcgdGhpcyBrZXksIGRlbm9mbG93IGNhbiBub3Qgc3RvcmUgdGhlIHVuaXF1ZSBrZXkgc3RhdGUuIEZpeCB0aGlzLCBUcnkgbm90IGNoYW5nZSB0aGUgcmVmZXJlbmNlIGl0ZW0sIG9ubHkgY2hhbmdlIHRoZSBwcm9wZXJ0eSB5b3UgbmVlZCB0byBjaGFuZ2UuIFRyeSB0byBtYW51YWwgYWRkaW5nIGEgXFxgQGRlbm9mbG93S2V5XFxgIGFzIGl0ZW0gdW5pcXVlIGtleS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPikgJiZcbiAgICAgICAgICAoKChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbXG4gICAgICAgICAgICAgIFwiQGRlbm9mbG93U291cmNlSW5kZXhcIlxuICAgICAgICAgICAgXSkgYXMgbnVtYmVyKSA+PSAwXG4gICAgICAgICkge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbVNvdXJjZUluZGV4ID1cbiAgICAgICAgICAgICgoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW1xuICAgICAgICAgICAgICBcIkBkZW5vZmxvd1NvdXJjZUluZGV4XCJcbiAgICAgICAgICAgIF0pIGFzIG51bWJlcjtcbiAgICAgICAgICBjdHguaXRlbVNvdXJjZU9wdGlvbnMgPVxuICAgICAgICAgICAgY3R4LnNvdXJjZXNPcHRpb25zW2N0eC5wdWJsaWMuaXRlbVNvdXJjZUluZGV4XTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChjdHgucHVibGljLml0ZW0pKSB7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHdvcmtmbG93UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgIGBDYW4gbm90IGZvdW5kIGludGVybmFsIGl0ZW0ga2V5IFxcYEBkZW5vZmxvd1NvdXJjZUluZGV4XFxgLCBtYXliZSB5b3UgY2hhbmdlZCB0aGUgaXRlbSBmb3JtYXQuIFRyeSBub3QgY2hhbmdlIHRoZSByZWZlcmVuY2UgaXRlbSwgb25seSBjaGFuZ2UgdGhlIHByb3BlcnR5IHlvdSBuZWVkIHRvIGNoYW5nZS4gVHJ5IHRvIG1hbnVhbCBhZGRpbmcgYSBcXGBAZGVub2Zsb3dLZXlcXGAgYXMgaXRlbSB1bmlxdWUga2V5LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdHguaXRlbVNvdXJjZU9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpdGVtUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gaXRlbToke2luZGV4fWAsXG4gICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF3b3JrZmxvdy5zdGVwcykge1xuICAgICAgICAgIHdvcmtmbG93LnN0ZXBzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgYCxcbiAgICAgICAgICAgIFwiU3RhcnQgcnVuIHN0ZXBzXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIuZGVidWcoYCR7SlNPTi5zdHJpbmdpZnkoY3R4LnB1YmxpYy5pdGVtLCBudWxsLCAyKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgd29ya2Zsb3cuc3RlcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBzdGVwID0gd29ya2Zsb3cuc3RlcHNbal07XG4gICAgICAgICAgY3R4LnB1YmxpYy5zdGVwSW5kZXggPSBqO1xuICAgICAgICAgIGNvbnN0IHN0ZXBSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IHN0ZXA6JHtjdHgucHVibGljLnN0ZXBJbmRleH1gLFxuICAgICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGxldCBzdGVwT3B0aW9ucyA9IHsgLi4uc3RlcCB9O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBwYXJzZSBlbnYgZmlyc3RcbiAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlIGlmIG9ubHlcbiAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTJLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzdGVwXCIsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCB7XG4gICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlM0ZvclN0ZXBLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICAgIHdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBzdGVwT3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpc0RlYnVnID0gc3RlcE9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICAgICAgYFN0YXJ0IHJ1biB0aGlzIHN0ZXAuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnY3R4MicsY3R4KTtcblxuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZENvZGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmlzUmVhbE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tqXSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgICBpZiAoc3RlcC5pZCkge1xuICAgICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgICAuLi5zdGVwT3B0aW9ucyxcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmNtZCkge1xuICAgICAgICAgICAgICAvLyBwYXJzZSBjbWRcblxuICAgICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgc3RlcE9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICAgIGBGaW5pc2ggdG8gcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG5cbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0ZXAuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gdGhpcyBpdGVtIHN0ZXBzIGFsbCBvaywgYWRkIHVuaXF1ZSBrZXlzIHRvIHRoZSBpbnRlcm5hbCBzdGF0ZVxuXG4gICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgIGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXCJcIiwgXCJGaW5pc2ggcnVuIHN0ZXAgXCIgKyBqKTtcblxuICAgICAgICAgIC8vIHBhcnNlIHNsZWVwXG4gICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcblxuICAgICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuc2xlZXAgJiYgc3RlcE9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYCR7c3RlcE9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYXdhaXQgZGVsYXkoc3RlcE9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgaXMgIWZvcmNlXG4gICAgICAgIC8vIGdldCBpdGVtIHNvdXJjZSBvcHRpb25zXG4gICAgICAgIGlmIChjdHguaXRlbVNvdXJjZU9wdGlvbnMgJiYgIWN0eC5pdGVtU291cmNlT3B0aW9ucy5mb3JjZSkge1xuICAgICAgICAgIGlmICghY3R4LmludGVybmFsU3RhdGUgfHwgIWN0eC5pbnRlcm5hbFN0YXRlLmtleXMpIHtcbiAgICAgICAgICAgIGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSAmJlxuICAgICAgICAgICAgIWN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLmluY2x1ZGVzKGN0eC5wdWJsaWMuaXRlbUtleSEpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy51bnNoaWZ0KGN0eC5wdWJsaWMuaXRlbUtleSEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBvbmx5IHNhdmUgMTAwMCBpdGVtcyBmb3Igc2F2ZSBtZW1vcnlcbiAgICAgICAgICBpZiAoY3R4LmludGVybmFsU3RhdGUhLmtleXMubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICAgICAgY3R4LmludGVybmFsU3RhdGUhLmtleXMgPSBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy5zbGljZSgwLCAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdvcmtmbG93LnN0ZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBgLFxuICAgICAgICAgICAgYEZpbmlzaCBydW4gc3RlcHNgLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gcnVuIHBvc3Qgc3RlcFxuICAgICAgY29uc3QgcG9zdCA9IHdvcmtmbG93LnBvc3Q7XG4gICAgICBpZiAocG9zdCkge1xuICAgICAgICBjb25zdCBwb3N0UmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gcG9zdGAsXG4gICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IHBvc3RPcHRpb25zID0geyAuLi5wb3N0IH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICBpZiAocG9zdE9wdGlvbnMuZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvc3RPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgIFwiU2tpcCBwb3N0XCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHBhcnNlIG9uXG4gICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywge1xuICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAga2V5czogcGFyc2UzRm9yU3RlcEtleXMsXG4gICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICBwb3N0T3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgIHdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgIHBvc3RPcHRpb25zLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXNEZWJ1ZyA9IHBvc3RPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgU3RhcnQgcnVuIHBvc3QuYCxcbiAgICAgICAgICApO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjdHgyJyxjdHgpO1xuXG4gICAgICAgICAgY3R4ID0gYXdhaXQgcnVuU3RlcChjdHgsIHtcbiAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLFxuICAgICAgICAgICAgcmVwb3J0ZXI6IHBvc3RSZXBvcnRlcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAocG9zdE9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAvLyBwYXJzZSBjbWRcbiAgICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBbXCJjbWRcIl0sXG4gICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIHBvc3RPcHRpb25zLmNtZCBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwb3N0UmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICBgRmluaXNoIHRvIHJ1biBwb3N0LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChwb3N0LmNvbnRpbnVlT25FcnJvcikge1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gcG9zdGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gcG9zdGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGhpcyBpdGVtIHN0ZXBzIGFsbCBvaywgYWRkIHVuaXF1ZSBrZXlzIHRvIHRoZSBpbnRlcm5hbCBzdGF0ZVxuXG4gICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgIGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgIHJlcG9ydGVyOiBwb3N0UmVwb3J0ZXIsXG4gICAgICAgICAgICAuLi5wb3N0T3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3N0T3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgIHJlcG9ydGVyOiBwb3N0UmVwb3J0ZXIsXG4gICAgICAgICAgICAuLi5wb3N0T3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcIlwiLCBcIkZpbmlzaCBydW4gcG9zdCBcIik7XG5cbiAgICAgICAgLy8gcGFyc2Ugc2xlZXBcbiAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAga2V5czogW1wic2xlZXBcIl0sXG4gICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgIGlmIChwb3N0T3B0aW9ucy5zbGVlcCAmJiBwb3N0T3B0aW9ucy5zbGVlcCA+IDApIHtcbiAgICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGAke3Bvc3RPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgIFwiU2xlZXBcIixcbiAgICAgICAgICApO1xuICAgICAgICAgIGF3YWl0IGRlbGF5KHBvc3RPcHRpb25zLnNsZWVwICogMTAwMCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2F2ZSBzdGF0ZSwgaW50ZXJuYWxTdGF0ZVxuICAgICAgLy8gY2hlY2sgaXMgY2hhbmdlZFxuICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gSlNPTi5zdHJpbmdpZnkoY3R4LnB1YmxpYy5zdGF0ZSk7XG4gICAgICAvLyBhZGQgc3VjY2VzcyBpdGVtcyB1bmlxdWVLZXkgdG8gaW50ZXJuYWwgU3RhdGVcblxuICAgICAgY29uc3QgY3VycmVudEludGVybmFsU3RhdGUgPSBKU09OLnN0cmluZ2lmeShjdHguaW50ZXJuYWxTdGF0ZSk7XG4gICAgICBpZiAoY3VycmVudFN0YXRlICE9PSBjdHguaW5pdFN0YXRlKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZGVidWcoYFNhdmUgc3RhdGVgKTtcbiAgICAgICAgYXdhaXQgY3R4LmRiIS5zZXQoXCJzdGF0ZVwiLCBjdHgucHVibGljLnN0YXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdvcmtmbG93UmVwb3J0ZXIuZGVidWcoYFNraXAgc2F2ZSBzYXRlLCBjYXVzZSBubyBjaGFuZ2UgaGFwcGVuZWRgKTtcbiAgICAgIH1cbiAgICAgIGlmIChjdXJyZW50SW50ZXJuYWxTdGF0ZSAhPT0gY3R4LmluaXRJbnRlcm5hbFN0YXRlKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgYFNhdmUgaW50ZXJuYWwgc3RhdGVgLFxuICAgICAgICApO1xuICAgICAgICBhd2FpdCBjdHguZGIhLnNldChcImludGVybmFsU3RhdGVcIiwgY3R4LmludGVybmFsU3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgLy8gICBgU2tpcCBzYXZlIGludGVybmFsIHN0YXRlLCBjYXVzZSBubyBjaGFuZ2UgaGFwcGVuZWRgLFxuICAgICAgICAvLyApO1xuICAgICAgfVxuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYCxcbiAgICAgICAgXCJGaW5pc2ggd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5lcnJvcihcbiAgICAgICAgYEZhaWxlZCB0byBydW4gdGhpcyB3b3JrZmxvd2AsXG4gICAgICApO1xuXG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmVycm9yKGUpO1xuICAgICAgaWYgKHZhbGlkV29ya2Zsb3dzLmxlbmd0aCA+IHdvcmtmbG93SW5kZXggKyAxKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZGVidWcoXCJ3b3JrZmxvd1wiLCBcIlN0YXJ0IG5leHQgd29ya2Zsb3dcIik7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGN0eCxcbiAgICAgICAgZXJyb3I6IGUsXG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJcXG5cIik7XG4gIH1cbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgcmVwb3J0LmVycm9yKFwiRXJyb3IgZGV0YWlsczpcIik7XG4gICAgZXJyb3JzLmZvckVhY2goKGVycm9yKSA9PiB7XG4gICAgICByZXBvcnQuZXJyb3IoXG4gICAgICAgIGBSdW4gJHtnZXRSZXBvcnRlck5hbWUoZXJyb3IuY3R4KX0gZmFpbGVkLCBlcnJvcjogYCxcbiAgICAgICk7XG4gICAgICByZXBvcnQuZXJyb3IoZXJyb3IuZXJyb3IpO1xuICAgIH0pO1xuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcnVuIHRoaXMgdGltZWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFJlcG9ydGVyTmFtZShjdHg6IENvbnRleHQpIHtcbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gY3R4LnB1YmxpYy53b3JrZmxvd1JlbGF0aXZlUGF0aDtcbiAgY29uc3QgYWJzb2x1dGVQYXRoID0gY3R4LnB1YmxpYy53b3JrZmxvd1BhdGg7XG4gIGlmIChyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgcmV0dXJuIGFic29sdXRlUGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVsYXRpdmVQYXRoO1xuICB9XG59XG4iXX0=