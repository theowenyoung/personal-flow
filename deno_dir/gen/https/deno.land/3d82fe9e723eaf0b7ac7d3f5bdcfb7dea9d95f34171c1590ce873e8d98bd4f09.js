import { cac, getStdin, version } from "./deps.ts";
import { run } from "./core/run-workflows.ts";
function main() {
    const cli = cac("denoflow");
    cli
        .command("run [...files or url]", "Run workflows")
        .option("--force", "Force run workflow files, if true, will ignore to read/save state").option("--debug", "Debug mode, will print more info").option("--database <database-url>", "Database uri, default json://data").option("--limit", "max items for workflow every runs").option("--sleep <seconds>", "sleep time between sources, filter, steps, unit seconds").option("--stdin", "read yaml file from stdin, e.g. cat test.yml | denoflow run --stdin")
        .action(async (files, options) => {
        console.log("Denoflow version: ", version);
        let content;
        if (options.stdin) {
            content = await getStdin({ exitOnEnter: false });
        }
        await run({
            ...options,
            content: content,
            files: files,
        });
    });
    cli
        .command("[SUB COMMAND] [...files] [OPTIONS]", "")
        .action(() => {
        cli.outputHelp();
    });
    cli.help();
    cli.version(version);
    cli.parse();
}
if (import.meta.main) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFOUMsU0FBUyxJQUFJO0lBQ1gsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLEdBQUc7U0FDQSxPQUFPLENBQUMsdUJBQXVCLEVBQUUsZUFBZSxDQUFDO1NBQ2pELE1BQU0sQ0FDTCxTQUFTLEVBQ1QsbUVBQW1FLENBQ3BFLENBQUMsTUFBTSxDQUNOLFNBQVMsRUFDVCxrQ0FBa0MsQ0FDbkMsQ0FBQyxNQUFNLENBQ04sMkJBQTJCLEVBQzNCLG1DQUFtQyxDQUNwQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsbUNBQW1DLENBQUMsQ0FBQyxNQUFNLENBQzdELG1CQUFtQixFQUNuQix5REFBeUQsQ0FDMUQsQ0FBQyxNQUFNLENBQ04sU0FBUyxFQUNULHFFQUFxRSxDQUN0RTtTQUNBLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0MsSUFBSSxPQUEyQixDQUFDO1FBQ2hDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNqQixPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztTQUNsRDtRQUNELE1BQU0sR0FBRyxDQUFDO1lBQ1IsR0FBRyxPQUFPO1lBQ1YsT0FBTyxFQUFFLE9BQU87WUFDaEIsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUdMLEdBQUc7U0FFQSxPQUFPLENBQUMsb0NBQW9DLEVBQUUsRUFBRSxDQUFDO1NBQ2pELE1BQU0sQ0FBQyxHQUFHLEVBQUU7UUFDWCxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFTCxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7SUFHWCxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXJCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNkLENBQUM7QUFFRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3BCLElBQUksRUFBRSxDQUFDO0NBQ1IiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjYWMsIGdldFN0ZGluLCB2ZXJzaW9uIH0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgcnVuIH0gZnJvbSBcIi4vY29yZS9ydW4td29ya2Zsb3dzLnRzXCI7XG5cbmZ1bmN0aW9uIG1haW4oKSB7XG4gIGNvbnN0IGNsaSA9IGNhYyhcImRlbm9mbG93XCIpO1xuICBjbGlcbiAgICAuY29tbWFuZChcInJ1biBbLi4uZmlsZXMgb3IgdXJsXVwiLCBcIlJ1biB3b3JrZmxvd3NcIilcbiAgICAub3B0aW9uKFxuICAgICAgXCItLWZvcmNlXCIsXG4gICAgICBcIkZvcmNlIHJ1biB3b3JrZmxvdyBmaWxlcywgaWYgdHJ1ZSwgd2lsbCBpZ25vcmUgdG8gcmVhZC9zYXZlIHN0YXRlXCIsXG4gICAgKS5vcHRpb24oXG4gICAgICBcIi0tZGVidWdcIixcbiAgICAgIFwiRGVidWcgbW9kZSwgd2lsbCBwcmludCBtb3JlIGluZm9cIixcbiAgICApLm9wdGlvbihcbiAgICAgIFwiLS1kYXRhYmFzZSA8ZGF0YWJhc2UtdXJsPlwiLFxuICAgICAgXCJEYXRhYmFzZSB1cmksIGRlZmF1bHQganNvbjovL2RhdGFcIixcbiAgICApLm9wdGlvbihcIi0tbGltaXRcIiwgXCJtYXggaXRlbXMgZm9yIHdvcmtmbG93IGV2ZXJ5IHJ1bnNcIikub3B0aW9uKFxuICAgICAgXCItLXNsZWVwIDxzZWNvbmRzPlwiLFxuICAgICAgXCJzbGVlcCB0aW1lIGJldHdlZW4gc291cmNlcywgZmlsdGVyLCBzdGVwcywgdW5pdCBzZWNvbmRzXCIsXG4gICAgKS5vcHRpb24oXG4gICAgICBcIi0tc3RkaW5cIixcbiAgICAgIFwicmVhZCB5YW1sIGZpbGUgZnJvbSBzdGRpbiwgZS5nLiBjYXQgdGVzdC55bWwgfCBkZW5vZmxvdyBydW4gLS1zdGRpblwiLFxuICAgIClcbiAgICAuYWN0aW9uKGFzeW5jIChmaWxlcywgb3B0aW9ucykgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJEZW5vZmxvdyB2ZXJzaW9uOiBcIiwgdmVyc2lvbik7XG4gICAgICBsZXQgY29udGVudDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKG9wdGlvbnMuc3RkaW4pIHtcbiAgICAgICAgY29udGVudCA9IGF3YWl0IGdldFN0ZGluKHsgZXhpdE9uRW50ZXI6IGZhbHNlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuKHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgICAgZmlsZXM6IGZpbGVzLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgLy8gZGVmYXVsdCBjb21tYW5kXG4gIGNsaVxuICAgIC8vIFNpbXBseSBvbWl0IHRoZSBjb21tYW5kIG5hbWUsIGp1c3QgYnJhY2tldHNcbiAgICAuY29tbWFuZChcIltTVUIgQ09NTUFORF0gWy4uLmZpbGVzXSBbT1BUSU9OU11cIiwgXCJcIilcbiAgICAuYWN0aW9uKCgpID0+IHtcbiAgICAgIGNsaS5vdXRwdXRIZWxwKCk7XG4gICAgfSk7XG5cbiAgY2xpLmhlbHAoKTtcbiAgLy8gRGlzcGxheSB2ZXJzaW9uIG51bWJlciB3aGVuIGAtdmAgb3IgYC0tdmVyc2lvbmAgYXBwZWFyc1xuICAvLyBJdCdzIGFsc28gdXNlZCBpbiBoZWxwIG1lc3NhZ2VcbiAgY2xpLnZlcnNpb24odmVyc2lvbik7XG5cbiAgY2xpLnBhcnNlKCk7XG59XG5cbmlmIChpbXBvcnQubWV0YS5tYWluKSB7XG4gIG1haW4oKTtcbn1cbiJdfQ==