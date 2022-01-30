import { FeedType } from "./../types/mod.ts";
import { copyValueFields, isValidURL } from "./../util.ts";
import { SlashFieldArray } from "./../types/slash.ts";
import { copyMedia } from "./media_mapper.ts";
import { DublinCoreFieldArray } from "../types/internal/internal_dublin_core.ts";
import { AtomFields, DublinCoreFields } from "../types/fields/mod.ts";
export const toLegacyRss1 = (rss) => {
    const { title, description, link, about, ...channel } = rss.channel;
    const result = {
        channel,
    };
    result.channel.title = title?.value;
    result.channel.description = description?.value;
    result.channel.link = link?.value;
    result.channel.about = about?.value;
    copyValueFields(DublinCoreFieldArray, result.channel, result.channel);
    if (rss.image) {
        result.image = {
            title: rss.image.title?.value,
            link: rss.image.link?.value,
            about: rss.image.about,
            url: rss.image.url?.value,
            resource: rss.image.resource,
        };
    }
    result.item = rss.item?.map((item) => {
        const { link, title, description, ...itemRest } = item;
        const itemResult = itemRest;
        itemResult.title = title?.value;
        itemResult.description = description?.value;
        itemResult.link = link?.value;
        copyValueFields(DublinCoreFieldArray, item, itemResult);
        copyValueFields(SlashFieldArray, item, itemResult);
        return itemResult;
    });
    if (rss.textInput) {
        result.textInput = {
            title: rss.textInput.title?.value,
            about: rss.textInput.about,
            description: rss.textInput.description?.value,
            link: rss.textInput.link?.value,
            name: rss.textInput.name?.value,
        };
    }
    return result;
};
export const toLegacyRss2 = (rss) => {
    const result = {};
    if (rss.channel) {
        const { items, title, description, generator, pubDate, pubDateRaw, lastBuildDate, lastBuildDateRaw, docs, webMaster, language, copyright, ttl, skipDays, skipHours, link, image, ...rest } = rss.channel;
        result.channel = rest;
        Object.assign(result.channel, {
            title: title?.value,
            description: description?.value,
            language: language?.value,
            link: rss.channel.link?.value,
            ttl: rss.channel.ttl?.value,
            docs: rss.channel.docs?.value,
            copyright: rss.channel.copyright?.value,
            managingEditor: rss.channel.managingEditor?.value,
            lastBuildDate: rss.channel.lastBuildDate?.value,
            lastBuildDateRaw: rss.channel.lastBuildDateRaw?.value,
            webMaster: rss.channel.webMaster?.value,
            pubDate: rss.channel.pubDate?.value,
            pubDateRaw: rss.channel.pubDateRaw?.value,
            generator: rss.channel.generator?.value,
            category: rss.channel.category?.map((x) => x.value),
            items: rss.channel.items?.map((item) => {
                const { guid, pubDate, pubDateRaw, title, description, link, author, enclosure, comments, categories, ...itemRest } = item;
                const itemResult = Object.assign(itemRest, {
                    guid: guid?.value,
                    pubDate: pubDate?.value,
                    pubDateRaw: pubDateRaw?.value,
                    title: title?.value,
                    description: description?.value,
                    link: link?.value,
                    author: author?.value ||
                        ((item[DublinCoreFields.Creator]?.length || 0) > 0
                            ? item[DublinCoreFields.Creator]?.[0].value
                            : undefined),
                    enclosure: enclosure?.[0]
                        ? {
                            url: enclosure?.[0].url,
                            type: enclosure?.[0].type,
                            length: enclosure?.[0].length,
                        }
                        : undefined,
                    comments: comments?.value,
                    categories: categories?.map((x) => x.value),
                });
                copyValueFields(DublinCoreFieldArray, item, itemResult);
                copyMedia(item, itemResult);
                return itemResult;
            }),
        });
        if (image) {
            result.channel.image = {
                url: image.url?.value,
                title: image.title?.value,
                link: image.link?.value,
                width: image.width?.value,
                height: image.height?.value,
            };
        }
        if (skipHours && skipHours.hour) {
            result.channel.skipHours = {
                hour: skipHours.hour?.map((x) => x?.value),
            };
        }
        if (skipDays && skipDays.day) {
            result.channel.skipDays = {
                day: skipDays.day?.map((x) => x.value),
            };
        }
    }
    return result;
};
export const toLegacyAtom = (atom) => {
    const { id, generator, title, subtitle, updated, updatedRaw, icon, links, logo, categories, author, entries, ...rest } = atom;
    const result = Object.assign(rest, {
        title: {
            type: atom.title?.type,
            value: atom.title?.value,
        },
        id: id?.value,
        icon: icon?.value,
        logo: logo?.value,
        updated: updated?.value,
        updatedRaw: updatedRaw?.value,
        links: links?.map((x) => ({
            href: x.href,
            rel: x.rel,
            type: x.type,
            length: x.length,
        })),
        categories: categories?.map((x) => ({
            term: x.term,
            label: x.label,
        })),
        subtitle: subtitle?.value,
        author: {
            name: author?.name?.value,
            email: author?.email?.value,
            uri: author?.uri?.value,
        },
        entries: entries?.map((entry) => {
            const { links, href, id, title, summary, published, publishedRaw, updated, updatedRaw, source, author, content, contributors, categories, rights, ...entryRest } = entry;
            const entryResult = Object.assign(entryRest, {
                id: id?.value,
                title: {
                    type: title?.type,
                    value: title?.value,
                },
                updated: updated?.value,
                updatedRaw: updatedRaw?.value,
                published: published?.value,
                publishedRaw: publishedRaw?.value,
                href: href,
                content: {
                    type: content?.type,
                    src: content?.src,
                    value: content?.value,
                },
                links: links?.map((x) => ({
                    type: x.type,
                    href: x.href,
                    rel: x.rel,
                    length: x.length,
                })),
                author: {
                    name: author?.name?.value,
                    email: author?.email?.value,
                    uri: author?.uri?.value,
                },
                contributors: contributors?.map((contributor) => ({
                    name: contributor?.name?.value,
                    email: contributor?.email?.value,
                    uri: contributor?.uri?.value,
                })),
                summary: {
                    type: summary?.type,
                    value: summary?.value,
                },
                rights: {
                    type: rights?.type,
                    value: rights?.value,
                },
                categories: categories?.map((category) => ({
                    label: category.label,
                    term: category.term,
                })),
                source: {
                    id: source?.id?.value,
                    title: source?.title?.value,
                    updated: source?.updated?.value,
                    updatedRaw: source?.updatedRaw?.value,
                },
            });
            return entryResult;
        }),
    });
    return result;
};
export const toJsonFeed = (feedType, feed) => {
    if (!feed) {
        return null;
    }
    let result = null;
    switch (feedType) {
        case FeedType.Atom:
            result = mapAtomToJsonFeed(feed);
            break;
        case FeedType.Rss2:
            result = mapRss2ToJsonFeed(feed);
            break;
        case FeedType.Rss1:
            result = mapRss1ToJsonFeed(feed);
            break;
    }
    return result;
};
const mapRss2ToJsonFeed = (rss) => {
    const items = rss.channel?.items?.map((rssItem) => {
        let authors, author, attachments;
        if (rssItem.author) {
            author = {
                name: rssItem.author,
            };
            authors = [author];
        }
        else if (rssItem[DublinCoreFields.Creator]) {
            author = {
                name: rssItem[DublinCoreFields.Creator]?.[0],
            };
            authors = rssItem[DublinCoreFields.Creator]?.map((creator) => ({
                name: creator,
            }));
        }
        if (rssItem.enclosure) {
            attachments = [{
                    url: rssItem.enclosure.url,
                    mime_type: rssItem.enclosure.type,
                    size_in_bytes: rssItem.enclosure.length,
                }];
        }
        return {
            id: rssItem.guid,
            summary: rssItem.description,
            title: rssItem.title,
            external_url: rssItem.link,
            content_html: rssItem.link,
            author,
            authors,
            attachments,
            url: rssItem.link,
            date_published: rssItem.pubDate,
            date_publishedRaw: rssItem.pubDateRaw,
            date_modified: rssItem.pubDate,
            date_modifiedRaw: rssItem.pubDateRaw,
        };
    }) || [];
    const channel = rss.channel;
    let author, hubs;
    if (channel && (channel.managingEditor || channel.webMaster)) {
        author = {
            url: channel.managingEditor || channel.webMaster,
        };
    }
    if (channel?.cloud) {
        hubs = [{
                type: channel.cloud.protocol,
                url: `${channel.cloud.domain}${channel.cloud.port ? ":" + channel.cloud.port : ""}${channel.cloud.path}`,
            }];
    }
    return {
        title: channel?.title,
        description: channel?.description,
        icon: channel?.image?.url,
        home_page_url: channel?.link,
        items,
        author,
        hubs,
    };
};
const mapRss1ToJsonFeed = (rss) => {
    const result = {};
    if (rss?.channel) {
        result.title = rss.channel.title;
        result.description = rss.channel.description;
        result.feed_url = rss.channel.link;
        const authorNames = rss.channel[DublinCoreFields.Creator];
        if (authorNames && authorNames.length > 0) {
            result.author = {
                name: authorNames[0],
            };
        }
        result.items = rss.item.map((item) => {
            let author, authors;
            const authorNames = item[DublinCoreFields.Creator];
            if (authorNames && authorNames.length > 0) {
                author = {
                    name: authorNames[0],
                };
                authors = authorNames.map((x) => ({ name: x[0] }));
            }
            const itemResult = {
                id: item.link || item[DublinCoreFields.URI],
                title: item.title,
                summary: item.description,
                url: item.link || item[DublinCoreFields.URI],
                author,
                authors,
                date_modified: item[DublinCoreFields.DateSubmitted] ||
                    item[DublinCoreFields.Date],
                date_modifiedRaw: item[DublinCoreFields.DateSubmittedRaw] ||
                    item[DublinCoreFields.DateRaw],
                date_published: item[DublinCoreFields.DateSubmitted] ||
                    item[DublinCoreFields.Date],
                date_publishedRaw: item[DublinCoreFields.DateSubmittedRaw] ||
                    item[DublinCoreFields.DateRaw],
            };
            return itemResult;
        });
    }
    if (rss?.image) {
        result.icon = rss.image.url;
    }
    return result;
};
const mapAtomToJsonFeed = (atom) => {
    const feed = {
        icon: atom.icon,
        title: atom.title?.value ?? atom.title,
        author: atom.author
            ? {
                name: atom.author.name,
                url: atom.author.uri,
            }
            : undefined,
        items: atom.entries?.map((entry) => {
            let url;
            if (entry[AtomFields.FeedburnerOrigLink]) {
                url = entry[AtomFields.FeedburnerOrigLink];
            }
            else if (entry.href) {
                url = entry.href;
            }
            else if (isValidURL(entry.id)) {
                url = entry.id;
            }
            const item = {
                id: entry.id,
                title: entry.title?.value ?? entry.title,
                date_published: entry.published,
                date_publishedRaw: entry.publishedRaw,
                date_modified: entry.updated,
                date_modifiedRaw: entry.updatedRaw,
                summary: entry.summary?.value,
                tags: entry.categories?.map((x) => x.term),
                author: {
                    name: entry.author?.name,
                    url: entry.author?.uri,
                },
                url,
                attachments: entry.links?.filter((link) => link.rel === "enclosure")
                    .map((link) => ({
                    url: link.href,
                    mime_type: link.type,
                    size_in_bytes: link.length,
                })),
            };
            if (entry.content) {
                switch (entry.content.type?.toUpperCase()) {
                    case "XHTML":
                    case "HTML":
                        item.content_html = entry.content.value;
                        break;
                    default:
                        item.content_text = entry.content.value;
                        break;
                }
            }
            return item;
        }),
    };
    if (atom.links?.length) {
        for (const link of atom.links) {
            switch (link.rel) {
                case "self":
                    feed.home_page_url = link.href;
                    break;
                case "alternate":
                    feed.feed_url = link.href;
                    break;
            }
        }
    }
    return feed;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcGVyX2xlZ2FjeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcnNzQDAuNS41L3NyYy9tYXBwZXJzL21hcHBlcl9sZWdhY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0JBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUU3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUV0RSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFpQixFQUFRLEVBQUU7SUFDdEQsTUFBTSxFQUNKLEtBQUssRUFDTCxXQUFXLEVBQ1gsSUFBSSxFQUNKLEtBQUssRUFDTCxHQUFHLE9BQU8sRUFDWCxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFFaEIsTUFBTSxNQUFNLEdBQUc7UUFDYixPQUFPO0tBQ0EsQ0FBQztJQUVWLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRSxLQUFlLENBQUM7SUFDOUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxFQUFFLEtBQWUsQ0FBQztJQUMxRCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLEVBQUUsS0FBZSxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRSxLQUFlLENBQUM7SUFDOUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFD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S0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEVBQUU7b0JBQ3pDLEtBQUssT0FBTyxDQUFDO29CQUNiLEtBQUssTUFBTTt3QkFDVCxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO3dCQUN4QyxNQUFNO29CQUNSO3dCQUNFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7d0JBQ3hDLE1BQU07aUJBQ1Q7YUFDRjtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO0tBQ1MsQ0FBQztJQUVkLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUU7UUFDdEIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQzdCLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDaEIsS0FBSyxNQUFNO29CQUNULElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDL0IsTUFBTTtnQkFDUixLQUFLLFdBQVc7b0JBQ2QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUMxQixNQUFNO2FBQ1Q7U0FDRjtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7XG4gIEF0b20sXG4gIEpzb25GZWVkLFxuICBKc29uRmVlZEF1dGhvcixcbiAgSnNvbkZlZWRJdGVtLFxuICBSU1MxLFxuICBSU1MyLFxuICBSc3MySXRlbSxcbn0gZnJvbSBcIi4vLi4vdHlwZXMvbW9kLnRzXCI7XG5cbmltcG9ydCB0eXBlIHtcbiAgSW50ZXJuYWxBdG9tLFxuICBJbnRlcm5hbFJTUzEsXG4gIEludGVybmFsUlNTMixcbn0gZnJvbSBcIi4uL3R5cGVzL2ludGVybmFsL21vZC50c1wiO1xuXG5pbXBvcnQgeyBGZWVkVHlwZSB9IGZyb20gXCIuLy4uL3R5cGVzL21vZC50c1wiO1xuXG5pbXBvcnQgeyBjb3B5VmFsdWVGaWVsZHMsIGlzVmFsaWRVUkwgfSBmcm9tIFwiLi8uLi91dGlsLnRzXCI7XG5pbXBvcnQgeyBTbGFzaEZpZWxkQXJyYXkgfSBmcm9tIFwiLi8uLi90eXBlcy9zbGFzaC50c1wiO1xuaW1wb3J0IHsgY29weU1lZGlhIH0gZnJvbSBcIi4vbWVkaWFfbWFwcGVyLnRzXCI7XG5pbXBvcnQgeyBEdWJsaW5Db3JlRmllbGRBcnJheSB9IGZyb20gXCIuLi90eXBlcy9pbnRlcm5hbC9pbnRlcm5hbF9kdWJsaW5fY29yZS50c1wiO1xuaW1wb3J0IHsgQXRvbUZpZWxkcywgRHVibGluQ29yZUZpZWxkcyB9IGZyb20gXCIuLi90eXBlcy9maWVsZHMvbW9kLnRzXCI7XG5cbmV4cG9ydCBjb25zdCB0b0xlZ2FjeVJzczEgPSAocnNzOiBJbnRlcm5hbFJTUzEpOiBSU1MxID0+IHtcbiAgY29uc3Qge1xuICAgIHRpdGxlLFxuICAgIGRlc2NyaXB0aW9uLFxuICAgIGxpbmssXG4gICAgYWJvdXQsXG4gICAgLi4uY2hhbm5lbFxuICB9ID0gcnNzLmNoYW5uZWw7XG5cbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIGNoYW5uZWwsXG4gIH0gYXMgUlNTMTtcblxuICByZXN1bHQuY2hhbm5lbC50aXRsZSA9IHRpdGxlPy52YWx1ZSBhcyBzdHJpbmc7XG4gIHJlc3VsdC5jaGFubmVsLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24/LnZhbHVlIGFzIHN0cmluZztcbiAgcmVzdWx0LmNoYW5uZWwubGluayA9IGxpbms/LnZhbHVlIGFzIHN0cmluZztcbiAgcmVzdWx0LmNoYW5uZWwuYWJvdXQgPSBhYm91dD8udmFsdWUgYXMgc3RyaW5nO1xuICBjb3B5VmFsdWVGaWVsZHMoRHVibGluQ29yZUZpZWxkQXJyYXksIHJlc3VsdC5jaGFubmVsLCByZXN1bHQuY2hhbm5lbCk7XG5cbiAgaWYgKHJzcy5pbWFnZSkge1xuICAgIHJlc3VsdC5pbWFnZSA9IHtcbiAgICAgIHRpdGxlOiByc3MuaW1hZ2UudGl0bGU/LnZhbHVlIGFzIHN0cmluZyxcbiAgICAgIGxpbms6IHJzcy5pbWFnZS5saW5rPy52YWx1ZSBhcyBzdHJpbmcsXG4gICAgICBhYm91dDogcnNzLmltYWdlLmFib3V0LFxuICAgICAgdXJsOiByc3MuaW1hZ2UudXJsPy52YWx1ZSBhcyBzdHJpbmcsXG4gICAgICByZXNvdXJjZTogcnNzLmltYWdlLnJlc291cmNlLFxuICAgIH07XG4gIH1cblxuICByZXN1bHQuaXRlbSA9IHJzcy5pdGVtPy5tYXAoKGl0ZW0pID0+IHtcbiAgICBjb25zdCB7XG4gICAgICBsaW5rLFxuICAgICAgdGl0bGUsXG4gICAgICBkZXNjcmlwdGlvbixcbiAgICAgIC4uLml0ZW1SZXN0XG4gICAgfSA9IGl0ZW07XG5cbiAgICBjb25zdCBpdGVtUmVzdWx0ID0gaXRlbVJlc3QgYXMgYW55O1xuICAgIGl0ZW1SZXN1bHQudGl0bGUgPSB0aXRsZT8udmFsdWUgYXMgc3RyaW5nO1xuICAgIGl0ZW1SZXN1bHQuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbj8udmFsdWUgYXMgc3RyaW5nO1xuICAgIGl0ZW1SZXN1bHQubGluayA9IGxpbms/LnZhbHVlIGFzIHN0cmluZztcbiAgICBjb3B5VmFsdWVGaWVsZHMoRHVibGluQ29yZUZpZWxkQXJyYXksIGl0ZW0sIGl0ZW1SZXN1bHQpO1xuICAgIGNvcHlWYWx1ZUZpZWxkcyhTbGFzaEZpZWxkQXJyYXksIGl0ZW0sIGl0ZW1SZXN1bHQpO1xuICAgIHJldHVybiBpdGVtUmVzdWx0O1xuICB9KTtcblxuICBpZiAocnNzLnRleHRJbnB1dCkge1xuICAgIHJlc3VsdC50ZXh0SW5wdXQgPSB7XG4gICAgICB0aXRsZTogcnNzLnRleHRJbnB1dC50aXRsZT8udmFsdWUgYXMgc3RyaW5nLFxuICAgICAgYWJvdXQ6IHJzcy50ZXh0SW5wdXQuYWJvdXQsXG4gICAgICBkZXNjcmlwdGlvbjogcnNzLnRleHRJbnB1dC5kZXNjcmlwdGlvbj8udmFsdWUgYXMgc3RyaW5nLFxuICAgICAgbGluazogcnNzLnRleHRJbnB1dC5saW5rPy52YWx1ZSBhcyBzdHJpbmcsXG4gICAgICBuYW1lOiByc3MudGV4dElucHV0Lm5hbWU/LnZhbHVlIGFzIHN0cmluZyxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydCBjb25zdCB0b0xlZ2FjeVJzczIgPSAocnNzOiBJbnRlcm5hbFJTUzIpOiBSU1MyID0+IHtcbiAgY29uc3QgcmVzdWx0ID0ge30gYXMgUlNTMjtcblxuICBpZiAocnNzLmNoYW5uZWwpIHtcbiAgICBjb25zdCB7XG4gICAgICBpdGVtcyxcbiAgICAgIHRpdGxlLFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgICBnZW5lcmF0b3IsXG4gICAgICBwdWJEYXRlLFxuICAgICAgcHViRGF0ZVJhdyxcbiAgICAgIGxhc3RCdWlsZERhdGUsXG4gICAgICBsYXN0QnVpbGREYXRlUmF3LFxuICAgICAgZG9jcyxcbiAgICAgIHdlYk1hc3RlcixcbiAgICAgIGxhbmd1YWdlLFxuICAgICAgY29weXJpZ2h0LFxuICAgICAgdHRsLFxuICAgICAgc2tpcERheXMsXG4gICAgICBza2lwSG91cnMsXG4gICAgICBsaW5rLFxuICAgICAgaW1hZ2UsXG4gICAgICAuLi5yZXN0XG4gICAgfSA9IHJzcy5jaGFubmVsO1xuXG4gICAgcmVzdWx0LmNoYW5uZWwgPSByZXN0IGFzIGFueTtcbiAgICBPYmplY3QuYXNzaWduKHJlc3VsdC5jaGFubmVsLCB7XG4gICAgICB0aXRsZTogdGl0bGU/LnZhbHVlLFxuICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uPy52YWx1ZSxcbiAgICAgIGxhbmd1YWdlOiBsYW5ndWFnZT8udmFsdWUsXG4gICAgICBsaW5rOiByc3MuY2hhbm5lbC5saW5rPy52YWx1ZSxcbiAgICAgIHR0bDogcnNzLmNoYW5uZWwudHRsPy52YWx1ZSxcbiAgICAgIGRvY3M6IHJzcy5jaGFubmVsLmRvY3M/LnZhbHVlLFxuICAgICAgY29weXJpZ2h0OiByc3MuY2hhbm5lbC5jb3B5cmlnaHQ/LnZhbHVlLFxuICAgICAgbWFuYWdpbmdFZGl0b3I6IHJzcy5jaGFubmVsLm1hbmFnaW5nRWRpdG9yPy52YWx1ZSxcbiAgICAgIGxhc3RCdWlsZERhdGU6IHJzcy5jaGFubmVsLmxhc3RCdWlsZERhdGU/LnZhbHVlLFxuICAgICAgbGFzdEJ1aWxkRGF0ZVJhdzogcnNzLmNoYW5uZWwubGFzdEJ1aWxkRGF0ZVJhdz8udmFsdWUsXG4gICAgICB3ZWJNYXN0ZXI6IHJzcy5jaGFubmVsLndlYk1hc3Rlcj8udmFsdWUsXG4gICAgICBwdWJEYXRlOiByc3MuY2hhbm5lbC5wdWJEYXRlPy52YWx1ZSxcbiAgICAgIHB1YkRhdGVSYXc6IHJzcy5jaGFubmVsLnB1YkRhdGVSYXc/LnZhbHVlLFxuICAgICAgZ2VuZXJhdG9yOiByc3MuY2hhbm5lbC5nZW5lcmF0b3I/LnZhbHVlLFxuICAgICAgY2F0ZWdvcnk6IHJzcy5jaGFubmVsLmNhdGVnb3J5Py5tYXAoKHgpID0+IHgudmFsdWUpLFxuICAgICAgaXRlbXM6IHJzcy5jaGFubmVsLml0ZW1zPy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGd1aWQsXG4gICAgICAgICAgcHViRGF0ZSxcbiAgICAgICAgICBwdWJEYXRlUmF3LFxuICAgICAgICAgIHRpdGxlLFxuICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgIGxpbmssXG4gICAgICAgICAgYXV0aG9yLFxuICAgICAgICAgIGVuY2xvc3VyZSxcbiAgICAgICAgICBjb21tZW50cyxcbiAgICAgICAgICBjYXRlZ29yaWVzLFxuICAgICAgICAgIC4uLml0ZW1SZXN0XG4gICAgICAgIH0gPSBpdGVtO1xuXG4gICAgICAgIGNvbnN0IGl0ZW1SZXN1bHQgPSBPYmplY3QuYXNzaWduKGl0ZW1SZXN0IGFzIFJzczJJdGVtLCB7XG4gICAgICAgICAgZ3VpZDogZ3VpZD8udmFsdWUsXG4gICAgICAgICAgcHViRGF0ZTogcHViRGF0ZT8udmFsdWUsXG4gICAgICAgICAgcHViRGF0ZVJhdzogcHViRGF0ZVJhdz8udmFsdWUsXG4gICAgICAgICAgdGl0bGU6IHRpdGxlPy52YWx1ZSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24/LnZhbHVlLFxuICAgICAgICAgIGxpbms6IGxpbms/LnZhbHVlLFxuICAgICAgICAgIGF1dGhvcjogYXV0aG9yPy52YWx1ZSB8fFxuICAgICAgICAgICAgKChpdGVtW0R1YmxpbkNvcmVGaWVsZHMuQ3JlYXRvcl0/Lmxlbmd0aCB8fCAwKSA+IDBcbiAgICAgICAgICAgICAgPyBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuQ3JlYXRvcl0/LlswXS52YWx1ZVxuICAgICAgICAgICAgICA6IHVuZGVmaW5lZCksXG4gICAgICAgICAgZW5jbG9zdXJlOiBlbmNsb3N1cmU/LlswXVxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIHVybDogZW5jbG9zdXJlPy5bMF0udXJsLFxuICAgICAgICAgICAgICB0eXBlOiBlbmNsb3N1cmU/LlswXS50eXBlLFxuICAgICAgICAgICAgICBsZW5ndGg6IGVuY2xvc3VyZT8uWzBdLmxlbmd0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGNvbW1lbnRzOiBjb21tZW50cz8udmFsdWUsXG4gICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcz8ubWFwKCh4KSA9PiB4LnZhbHVlIGFzIHN0cmluZyksXG4gICAgICAgIH0pO1xuICAgICAgICBjb3B5VmFsdWVGaWVsZHMoRHVibGluQ29yZUZpZWxkQXJyYXksIGl0ZW0sIGl0ZW1SZXN1bHQpO1xuICAgICAgICBjb3B5TWVkaWEoaXRlbSwgaXRlbVJlc3VsdCk7XG4gICAgICAgIHJldHVybiBpdGVtUmVzdWx0O1xuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBpZiAoaW1hZ2UpIHtcbiAgICAgIHJlc3VsdC5jaGFubmVsLmltYWdlID0ge1xuICAgICAgICB1cmw6IGltYWdlLnVybD8udmFsdWUsXG4gICAgICAgIHRpdGxlOiBpbWFnZS50aXRsZT8udmFsdWUsXG4gICAgICAgIGxpbms6IGltYWdlLmxpbms/LnZhbHVlLFxuICAgICAgICB3aWR0aDogaW1hZ2Uud2lkdGg/LnZhbHVlLFxuICAgICAgICBoZWlnaHQ6IGltYWdlLmhlaWdodD8udmFsdWUsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChza2lwSG91cnMgJiYgc2tpcEhvdXJzLmhvdXIpIHtcbiAgICAgIHJlc3VsdC5jaGFubmVsLnNraXBIb3VycyA9IHtcbiAgICAgICAgaG91cjogc2tpcEhvdXJzLmhvdXI/Lm1hcCgoeCkgPT4geD8udmFsdWUpIGFzIG51bWJlcltdLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoc2tpcERheXMgJiYgc2tpcERheXMuZGF5KSB7XG4gICAgICByZXN1bHQuY2hhbm5lbC5za2lwRGF5cyA9IHtcbiAgICAgICAgZGF5OiBza2lwRGF5cy5kYXk/Lm1hcCgoeCkgPT4geC52YWx1ZSkgYXMgc3RyaW5nW10sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5leHBvcnQgY29uc3QgdG9MZWdhY3lBdG9tID0gKGF0b206IEludGVybmFsQXRvbSk6IEF0b20gPT4ge1xuICBjb25zdCB7XG4gICAgaWQsXG4gICAgZ2VuZXJhdG9yLFxuICAgIHRpdGxlLFxuICAgIHN1YnRpdGxlLFxuICAgIHVwZGF0ZWQsXG4gICAgdXBkYXRlZFJhdyxcbiAgICBpY29uLFxuICAgIGxpbmtzLFxuICAgIGxvZ28sXG4gICAgY2F0ZWdvcmllcyxcbiAgICBhdXRob3IsXG4gICAgZW50cmllcyxcbiAgICAuLi5yZXN0XG4gIH0gPSBhdG9tO1xuXG4gIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oXG4gICAgcmVzdCBhcyBBdG9tLFxuICAgIHtcbiAgICAgIHRpdGxlOiB7XG4gICAgICAgIHR5cGU6IGF0b20udGl0bGU/LnR5cGUsXG4gICAgICAgIHZhbHVlOiBhdG9tLnRpdGxlPy52YWx1ZSxcbiAgICAgIH0sXG4gICAgICBpZDogaWQ/LnZhbHVlLFxuICAgICAgaWNvbjogaWNvbj8udmFsdWUsXG4gICAgICBsb2dvOiBsb2dvPy52YWx1ZSxcbiAgICAgIHVwZGF0ZWQ6IHVwZGF0ZWQ/LnZhbHVlLFxuICAgICAgdXBkYXRlZFJhdzogdXBkYXRlZFJhdz8udmFsdWUsXG4gICAgICBsaW5rczogbGlua3M/Lm1hcCgoeCkgPT4gKHtcbiAgICAgICAgaHJlZjogeC5ocmVmLFxuICAgICAgICByZWw6IHgucmVsLFxuICAgICAgICB0eXBlOiB4LnR5cGUsXG4gICAgICAgIGxlbmd0aDogeC5sZW5ndGgsXG4gICAgICB9KSksXG4gICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzPy5tYXAoKHgpID0+ICh7XG4gICAgICAgIHRlcm06IHgudGVybSxcbiAgICAgICAgbGFiZWw6IHgubGFiZWwsXG4gICAgICB9KSksXG4gICAgICBzdWJ0aXRsZTogc3VidGl0bGU/LnZhbHVlLFxuICAgICAgYXV0aG9yOiB7XG4gICAgICAgIG5hbWU6IGF1dGhvcj8ubmFtZT8udmFsdWUsXG4gICAgICAgIGVtYWlsOiBhdXRob3I/LmVtYWlsPy52YWx1ZSxcbiAgICAgICAgdXJpOiBhdXRob3I/LnVyaT8udmFsdWUsXG4gICAgICB9LFxuICAgICAgZW50cmllczogZW50cmllcz8ubWFwKChlbnRyeSkgPT4ge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgbGlua3MsXG4gICAgICAgICAgaHJlZixcbiAgICAgICAgICBpZCxcbiAgICAgICAgICB0aXRsZSxcbiAgICAgICAgICBzdW1tYXJ5LFxuICAgICAgICAgIHB1Ymxpc2hlZCxcbiAgICAgICAgICBwdWJsaXNoZWRSYXcsXG4gICAgICAgICAgdXBkYXRlZCxcbiAgICAgICAgICB1cGRhdGVkUmF3LFxuICAgICAgICAgIHNvdXJjZSxcbiAgICAgICAgICBhdXRob3IsXG4gICAgICAgICAgY29udGVudCxcbiAgICAgICAgICBjb250cmlidXRvcnMsXG4gICAgICAgICAgY2F0ZWdvcmllcyxcbiAgICAgICAgICByaWdodHMsXG4gICAgICAgICAgLi4uZW50cnlSZXN0XG4gICAgICAgIH0gPSBlbnRyeTtcblxuICAgICAgICBjb25zdCBlbnRyeVJlc3VsdCA9IE9iamVjdC5hc3NpZ24oZW50cnlSZXN0LCB7XG4gICAgICAgICAgaWQ6IGlkPy52YWx1ZSxcbiAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgdHlwZTogdGl0bGU/LnR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdGl0bGU/LnZhbHVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdXBkYXRlZDogdXBkYXRlZD8udmFsdWUsXG4gICAgICAgICAgdXBkYXRlZFJhdzogdXBkYXRlZFJhdz8udmFsdWUsXG4gICAgICAgICAgcHVibGlzaGVkOiBwdWJsaXNoZWQ/LnZhbHVlLFxuICAgICAgICAgIHB1Ymxpc2hlZFJhdzogcHVibGlzaGVkUmF3Py52YWx1ZSxcbiAgICAgICAgICBocmVmOiBocmVmLFxuICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgIHR5cGU6IGNvbnRlbnQ/LnR5cGUsXG4gICAgICAgICAgICBzcmM6IGNvbnRlbnQ/LnNyYyxcbiAgICAgICAgICAgIHZhbHVlOiBjb250ZW50Py52YWx1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGxpbmtzOiBsaW5rcz8ubWFwKCh4KSA9PiAoe1xuICAgICAgICAgICAgdHlwZTogeC50eXBlLFxuICAgICAgICAgICAgaHJlZjogeC5ocmVmLFxuICAgICAgICAgICAgcmVsOiB4LnJlbCxcbiAgICAgICAgICAgIGxlbmd0aDogeC5sZW5ndGgsXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIGF1dGhvcjoge1xuICAgICAgICAgICAgbmFtZTogYXV0aG9yPy5uYW1lPy52YWx1ZSxcbiAgICAgICAgICAgIGVtYWlsOiBhdXRob3I/LmVtYWlsPy52YWx1ZSxcbiAgICAgICAgICAgIHVyaTogYXV0aG9yPy51cmk/LnZhbHVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29udHJpYnV0b3JzOiBjb250cmlidXRvcnM/Lm1hcCgoY29udHJpYnV0b3IpID0+ICh7XG4gICAgICAgICAgICBuYW1lOiBjb250cmlidXRvcj8ubmFtZT8udmFsdWUsXG4gICAgICAgICAgICBlbWFpbDogY29udHJpYnV0b3I/LmVtYWlsPy52YWx1ZSxcbiAgICAgICAgICAgIHVyaTogY29udHJpYnV0b3I/LnVyaT8udmFsdWUsXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIHN1bW1hcnk6IHtcbiAgICAgICAgICAgIHR5cGU6IHN1bW1hcnk/LnR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogc3VtbWFyeT8udmFsdWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByaWdodHM6IHtcbiAgICAgICAgICAgIHR5cGU6IHJpZ2h0cz8udHlwZSxcbiAgICAgICAgICAgIHZhbHVlOiByaWdodHM/LnZhbHVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcz8ubWFwKChjYXRlZ29yeSkgPT4gKHtcbiAgICAgICAgICAgIGxhYmVsOiBjYXRlZ29yeS5sYWJlbCxcbiAgICAgICAgICAgIHRlcm06IGNhdGVnb3J5LnRlcm0sXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIHNvdXJjZToge1xuICAgICAgICAgICAgaWQ6IHNvdXJjZT8uaWQ/LnZhbHVlLFxuICAgICAgICAgICAgdGl0bGU6IHNvdXJjZT8udGl0bGU/LnZhbHVlLFxuICAgICAgICAgICAgdXBkYXRlZDogc291cmNlPy51cGRhdGVkPy52YWx1ZSxcbiAgICAgICAgICAgIHVwZGF0ZWRSYXc6IHNvdXJjZT8udXBkYXRlZFJhdz8udmFsdWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5UmVzdWx0O1xuICAgICAgfSksXG4gICAgfSxcbiAgKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydCBjb25zdCB0b0pzb25GZWVkID0gKFxuICBmZWVkVHlwZTogRmVlZFR5cGUsXG4gIGZlZWQ6IEF0b20gfCBSU1MyIHwgUlNTMSxcbik6IEpzb25GZWVkIHwgbnVsbCA9PiB7XG4gIGlmICghZmVlZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc3VsdDogSnNvbkZlZWQgfCBudWxsID0gbnVsbDtcbiAgc3dpdGNoIChmZWVkVHlwZSkge1xuICAgIGNhc2UgRmVlZFR5cGUuQXRvbTpcbiAgICAgIHJlc3VsdCA9IG1hcEF0b21Ub0pzb25GZWVkKGZlZWQgYXMgQXRvbSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEZlZWRUeXBlLlJzczI6XG4gICAgICByZXN1bHQgPSBtYXBSc3MyVG9Kc29uRmVlZChmZWVkIGFzIFJTUzIpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBGZWVkVHlwZS5Sc3MxOlxuICAgICAgcmVzdWx0ID0gbWFwUnNzMVRvSnNvbkZlZWQoZmVlZCBhcyBSU1MxKTtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmNvbnN0IG1hcFJzczJUb0pzb25GZWVkID0gKHJzczogUlNTMik6IEpzb25GZWVkID0+IHtcbiAgY29uc3QgaXRlbXMgPSByc3MuY2hhbm5lbD8uaXRlbXM/Lm1hcCgocnNzSXRlbSkgPT4ge1xuICAgIGxldCBhdXRob3JzLCBhdXRob3IsIGF0dGFjaG1lbnRzO1xuXG4gICAgaWYgKHJzc0l0ZW0uYXV0aG9yKSB7XG4gICAgICBhdXRob3IgPSB7XG4gICAgICAgIG5hbWU6IHJzc0l0ZW0uYXV0aG9yLFxuICAgICAgfTtcbiAgICAgIGF1dGhvcnMgPSBbYXV0aG9yXTtcbiAgICB9IGVsc2UgaWYgKHJzc0l0ZW1bRHVibGluQ29yZUZpZWxkcy5DcmVhdG9yXSkge1xuICAgICAgYXV0aG9yID0ge1xuICAgICAgICBuYW1lOiByc3NJdGVtW0R1YmxpbkNvcmVGaWVsZHMuQ3JlYXRvcl0/LlswXSxcbiAgICAgIH07XG4gICAgICBhdXRob3JzID0gcnNzSXRlbVtEdWJsaW5Db3JlRmllbGRzLkNyZWF0b3JdPy5tYXAoKGNyZWF0b3IpID0+ICh7XG4gICAgICAgIG5hbWU6IGNyZWF0b3IsXG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgaWYgKHJzc0l0ZW0uZW5jbG9zdXJlKSB7XG4gICAgICBhdHRhY2htZW50cyA9IFt7XG4gICAgICAgIHVybDogcnNzSXRlbS5lbmNsb3N1cmUudXJsLFxuICAgICAgICBtaW1lX3R5cGU6IHJzc0l0ZW0uZW5jbG9zdXJlLnR5cGUsXG4gICAgICAgIHNpemVfaW5fYnl0ZXM6IHJzc0l0ZW0uZW5jbG9zdXJlLmxlbmd0aCxcbiAgICAgIH1dO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogcnNzSXRlbS5ndWlkLFxuICAgICAgc3VtbWFyeTogcnNzSXRlbS5kZXNjcmlwdGlvbixcbiAgICAgIHRpdGxlOiByc3NJdGVtLnRpdGxlLFxuICAgICAgZXh0ZXJuYWxfdXJsOiByc3NJdGVtLmxpbmssXG4gICAgICBjb250ZW50X2h0bWw6IHJzc0l0ZW0ubGluayxcbiAgICAgIGF1dGhvcixcbiAgICAgIGF1dGhvcnMsXG4gICAgICBhdHRhY2htZW50cyxcbiAgICAgIHVybDogcnNzSXRlbS5saW5rLFxuICAgICAgZGF0ZV9wdWJsaXNoZWQ6IHJzc0l0ZW0ucHViRGF0ZSxcbiAgICAgIGRhdGVfcHVibGlzaGVkUmF3OiByc3NJdGVtLnB1YkRhdGVSYXcsXG4gICAgICBkYXRlX21vZGlmaWVkOiByc3NJdGVtLnB1YkRhdGUsXG4gICAgICBkYXRlX21vZGlmaWVkUmF3OiByc3NJdGVtLnB1YkRhdGVSYXcsXG4gICAgfSBhcyBKc29uRmVlZEl0ZW07XG4gIH0pIHx8IFtdO1xuXG4gIGNvbnN0IGNoYW5uZWwgPSByc3MuY2hhbm5lbDtcbiAgbGV0IGF1dGhvciwgaHVicztcblxuICBpZiAoY2hhbm5lbCAmJiAoY2hhbm5lbC5tYW5hZ2luZ0VkaXRvciB8fCBjaGFubmVsLndlYk1hc3RlcikpIHtcbiAgICBhdXRob3IgPSB7XG4gICAgICB1cmw6IGNoYW5uZWwubWFuYWdpbmdFZGl0b3IgfHwgY2hhbm5lbC53ZWJNYXN0ZXIsXG4gICAgfTtcbiAgfVxuXG4gIGlmIChjaGFubmVsPy5jbG91ZCkge1xuICAgIGh1YnMgPSBbe1xuICAgICAgdHlwZTogY2hhbm5lbC5jbG91ZC5wcm90b2NvbCxcbiAgICAgIHVybDogYCR7Y2hhbm5lbC5jbG91ZC5kb21haW59JHtcbiAgICAgICAgY2hhbm5lbC5jbG91ZC5wb3J0ID8gXCI6XCIgKyBjaGFubmVsLmNsb3VkLnBvcnQgOiBcIlwiXG4gICAgICB9JHtjaGFubmVsLmNsb3VkLnBhdGh9YCxcbiAgICB9XTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdGl0bGU6IGNoYW5uZWw/LnRpdGxlLFxuICAgIGRlc2NyaXB0aW9uOiBjaGFubmVsPy5kZXNjcmlwdGlvbixcbiAgICBpY29uOiBjaGFubmVsPy5pbWFnZT8udXJsLFxuICAgIGhvbWVfcGFnZV91cmw6IGNoYW5uZWw/LmxpbmssXG4gICAgaXRlbXMsXG4gICAgYXV0aG9yLFxuICAgIGh1YnMsXG4gIH0gYXMgSnNvbkZlZWQ7XG59O1xuXG5jb25zdCBtYXBSc3MxVG9Kc29uRmVlZCA9IChyc3M6IFJTUzEpOiBKc29uRmVlZCA9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9IGFzIEpzb25GZWVkO1xuXG4gIGlmIChyc3M/LmNoYW5uZWwpIHtcbiAgICByZXN1bHQudGl0bGUgPSByc3MuY2hhbm5lbC50aXRsZTtcbiAgICByZXN1bHQuZGVzY3JpcHRpb24gPSByc3MuY2hhbm5lbC5kZXNjcmlwdGlvbjtcbiAgICByZXN1bHQuZmVlZF91cmwgPSByc3MuY2hhbm5lbC5saW5rO1xuXG4gICAgY29uc3QgYXV0aG9yTmFtZXMgPSByc3MuY2hhbm5lbFtEdWJsaW5Db3JlRmllbGRzLkNyZWF0b3JdO1xuICAgIGlmIChhdXRob3JOYW1lcyAmJiBhdXRob3JOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXN1bHQuYXV0aG9yID0ge1xuICAgICAgICBuYW1lOiBhdXRob3JOYW1lc1swXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmVzdWx0Lml0ZW1zID0gcnNzLml0ZW0ubWFwKChpdGVtKSA9PiB7XG4gICAgICBsZXQgYXV0aG9yLCBhdXRob3JzO1xuICAgICAgY29uc3QgYXV0aG9yTmFtZXMgPSBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuQ3JlYXRvcl07XG4gICAgICBpZiAoYXV0aG9yTmFtZXMgJiYgYXV0aG9yTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBhdXRob3IgPSB7XG4gICAgICAgICAgbmFtZTogYXV0aG9yTmFtZXNbMF0sXG4gICAgICAgIH07XG4gICAgICAgIGF1dGhvcnMgPSBhdXRob3JOYW1lcy5tYXAoKHgpID0+ICh7IG5hbWU6IHhbMF0gfSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpdGVtUmVzdWx0ID0ge1xuICAgICAgICBpZDogaXRlbS5saW5rIHx8IGl0ZW1bRHVibGluQ29yZUZpZWxkcy5VUkldLFxuICAgICAgICB0aXRsZTogaXRlbS50aXRsZSxcbiAgICAgICAgc3VtbWFyeTogaXRlbS5kZXNjcmlwdGlvbixcbiAgICAgICAgdXJsOiBpdGVtLmxpbmsgfHwgaXRlbVtEdWJsaW5Db3JlRmllbGRzLlVSSV0sXG4gICAgICAgIGF1dGhvcixcbiAgICAgICAgYXV0aG9ycyxcbiAgICAgICAgZGF0ZV9tb2RpZmllZDogaXRlbVtEdWJsaW5Db3JlRmllbGRzLkRhdGVTdWJtaXR0ZWRdIHx8XG4gICAgICAgICAgaXRlbVtEdWJsaW5Db3JlRmllbGRzLkRhdGVdLFxuICAgICAgICBkYXRlX21vZGlmaWVkUmF3OiBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuRGF0ZVN1Ym1pdHRlZFJhd10gfHxcbiAgICAgICAgICBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuRGF0ZVJhd10sXG4gICAgICAgIGRhdGVfcHVibGlzaGVkOiBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuRGF0ZVN1Ym1pdHRlZF0gfHxcbiAgICAgICAgICBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuRGF0ZV0sXG4gICAgICAgIGRhdGVfcHVibGlzaGVkUmF3OiBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuRGF0ZVN1Ym1pdHRlZFJhd10gfHxcbiAgICAgICAgICBpdGVtW0R1YmxpbkNvcmVGaWVsZHMuRGF0ZVJhd10sXG4gICAgICB9IGFzIEpzb25GZWVkSXRlbTtcbiAgICAgIHJldHVybiBpdGVtUmVzdWx0O1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHJzcz8uaW1hZ2UpIHtcbiAgICByZXN1bHQuaWNvbiA9IHJzcy5pbWFnZS51cmw7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuY29uc3QgbWFwQXRvbVRvSnNvbkZlZWQgPSAoYXRvbTogQXRvbSk6IEpzb25GZWVkID0+IHtcbiAgY29uc3QgZmVlZCA9IHtcbiAgICBpY29uOiBhdG9tLmljb24sXG4gICAgdGl0bGU6IGF0b20udGl0bGU/LnZhbHVlID8/IGF0b20udGl0bGUsXG4gICAgYXV0aG9yOiBhdG9tLmF1dGhvclxuICAgICAgPyB7XG4gICAgICAgIG5hbWU6IGF0b20uYXV0aG9yLm5hbWUsXG4gICAgICAgIHVybDogYXRvbS5hdXRob3IudXJpLFxuICAgICAgfSBhcyBKc29uRmVlZEF1dGhvclxuICAgICAgOiB1bmRlZmluZWQsXG4gICAgaXRlbXM6IGF0b20uZW50cmllcz8ubWFwKChlbnRyeSkgPT4ge1xuICAgICAgbGV0IHVybDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKGVudHJ5W0F0b21GaWVsZHMuRmVlZGJ1cm5lck9yaWdMaW5rXSkge1xuICAgICAgICB1cmwgPSBlbnRyeVtBdG9tRmllbGRzLkZlZWRidXJuZXJPcmlnTGlua107XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmhyZWYpIHtcbiAgICAgICAgdXJsID0gZW50cnkuaHJlZjtcbiAgICAgIH0gZWxzZSBpZiAoaXNWYWxpZFVSTChlbnRyeS5pZCkpIHtcbiAgICAgICAgdXJsID0gZW50cnkuaWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGl0ZW06IEpzb25GZWVkSXRlbSA9IHtcbiAgICAgICAgaWQ6IGVudHJ5LmlkLFxuICAgICAgICB0aXRsZTogZW50cnkudGl0bGU/LnZhbHVlID8/IGVudHJ5LnRpdGxlLFxuICAgICAgICBkYXRlX3B1Ymxpc2hlZDogZW50cnkucHVibGlzaGVkLFxuICAgICAgICBkYXRlX3B1Ymxpc2hlZFJhdzogZW50cnkucHVibGlzaGVkUmF3LFxuICAgICAgICBkYXRlX21vZGlmaWVkOiBlbnRyeS51cGRhdGVkLFxuICAgICAgICBkYXRlX21vZGlmaWVkUmF3OiBlbnRyeS51cGRhdGVkUmF3LFxuICAgICAgICBzdW1tYXJ5OiBlbnRyeS5zdW1tYXJ5Py52YWx1ZSxcbiAgICAgICAgdGFnczogZW50cnkuY2F0ZWdvcmllcz8ubWFwKCh4KSA9PiB4LnRlcm0pLFxuICAgICAgICBhdXRob3I6IHtcbiAgICAgICAgICBuYW1lOiBlbnRyeS5hdXRob3I/Lm5hbWUsXG4gICAgICAgICAgdXJsOiBlbnRyeS5hdXRob3I/LnVyaSxcbiAgICAgICAgfSxcbiAgICAgICAgdXJsLFxuICAgICAgICBhdHRhY2htZW50czogZW50cnkubGlua3M/LmZpbHRlcigobGluaykgPT4gbGluay5yZWwgPT09IFwiZW5jbG9zdXJlXCIpXG4gICAgICAgICAgLm1hcCgobGluaykgPT4gKHtcbiAgICAgICAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgICAgICAgbWltZV90eXBlOiBsaW5rLnR5cGUsXG4gICAgICAgICAgICBzaXplX2luX2J5dGVzOiBsaW5rLmxlbmd0aCxcbiAgICAgICAgICB9KSksXG4gICAgICB9O1xuXG4gICAgICBpZiAoZW50cnkuY29udGVudCkge1xuICAgICAgICBzd2l0Y2ggKGVudHJ5LmNvbnRlbnQudHlwZT8udG9VcHBlckNhc2UoKSkge1xuICAgICAgICAgIGNhc2UgXCJYSFRNTFwiOlxuICAgICAgICAgIGNhc2UgXCJIVE1MXCI6XG4gICAgICAgICAgICBpdGVtLmNvbnRlbnRfaHRtbCA9IGVudHJ5LmNvbnRlbnQudmFsdWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaXRlbS5jb250ZW50X3RleHQgPSBlbnRyeS5jb250ZW50LnZhbHVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfSksXG4gIH0gYXMgSnNvbkZlZWQ7XG5cbiAgaWYgKGF0b20ubGlua3M/Lmxlbmd0aCkge1xuICAgIGZvciAoY29uc3QgbGluayBvZiBhdG9tLmxpbmtzKSB7XG4gICAgICBzd2l0Y2ggKGxpbmsucmVsKSB7XG4gICAgICAgIGNhc2UgXCJzZWxmXCI6XG4gICAgICAgICAgZmVlZC5ob21lX3BhZ2VfdXJsID0gbGluay5ocmVmO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiYWx0ZXJuYXRlXCI6XG4gICAgICAgICAgZmVlZC5mZWVkX3VybCA9IGxpbmsuaHJlZjtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmVlZDtcbn07XG4iXX0=