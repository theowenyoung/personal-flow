import {Base64} from 'https://deno.land/x/bb64@1.1.0/mod.ts';
import puppeteer, {
  Browser,
  Page,
} from "https://deno.land/x/puppeteer@9.0.2/mod.ts";
import type {PublicContext} from 'https://deno.land/x/denoflow@0.0.27/mod.ts';
export default async function (item:Record<string,Record<string,string>[]>,ctx:PublicContext) {  
  let browser: Browser | null = null;
  let page: Page | null = null;
  const getBrowser = async () => {
    if (browser) return browser;
    browser = await puppeteer.launch({
      devtools: false,
      // headless: !isDev,
      defaultViewport: { width: 1370, height: 1200 },
      args: ["--lang=zh-Hans,zh", "--disable-gpu"],
    });
    browser.on("disconnected", () => (browser = null));
    return browser;
  };

  const getNewPage = async (url:string,force: boolean): Promise<Page> => {
    if (page) return page;
    browser = await getBrowser();
    const pages = await browser.pages();
    if (pages[0] && !force) {
      page = pages[0];
    } else {
      page = await browser.newPage();
    }
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
    );
    // await page.setViewport({ width: 1370, height: 1200 });
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(2000);
    // await page.screenshot({ path: "example.png" });

    return page;
  };
  const link = item.links[0].href as string;  
    page = await getNewPage(link,false);
  let b64encoded  = "";
  if(page){

    // save 
    // path: './changed/test.pdf'
   const result =  await page.pdf({scale:1.6, format: 'a4',omitBackground:true });
   
    // get base64
    // const decoder = new TextDecoder('utf-8');
     b64encoded =Base64.fromUint8Array(result).toString();

  }

  if (page) {
    await page.close();
  }
  // quit puppeteer
  if (browser) {
    await (browser as Browser)!.close();
  }
  // const title = "test";
  const title = (item.title as unknown as Record<string,string>).value.trim();
  
  if(b64encoded){
    const payload =  {
      AdvanceErrorHandling:true,
      SandboxMode:false,
      "Messages":[
        {
          "From": {
            "Email": ctx.env.FROM_EMAIL,
            "Name": "Kindle"
          },
          "To": [
            {
              "Email": ctx.env.TO_EMAIL,
              "Name": "Try"
            }
          ],
          "Subject": title,
          "TextPart": item.comments,
          "CustomID": item.id,  
          "Attachments":[
            {
              "Filename":`${title}.pdf`,
              "ContentType":"application/pdf",
              "Base64Content":b64encoded
            }
          ]
        }
      ]
    }    
    return (payload);
  }else{
    throw new Error('save pdf error')
  }

}

