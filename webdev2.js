"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webdav_1 = require("webdav");
let cachedData = {};
function getClient() {
    var _a, _b, _c;
    const { url, username, password, searchPath } = (_b = (_a = env === null || env === void 0 ? void 0 : env.getUserVariables) === null || _a === void 0 ? void 0 : _a.call(env)) !== null && _b !== void 0 ? _b : {};
    if (!(url && username && password)) {
        return null;
    }
    if (!(cachedData.url === url &&
        cachedData.username === username &&
        cachedData.password === password &&
        cachedData.searchPath === searchPath)) {
        cachedData.url = url;
        cachedData.username = username;
        cachedData.password = password;
        cachedData.searchPath = searchPath;
        cachedData.searchPathList = (_c = searchPath === null || searchPath === void 0 ? void 0 : searchPath.split) === null || _c === void 0 ? void 0 : _c.call(searchPath, ",");
        cachedData.cacheFileList = null;
    }
    return (0, webdav_1.createClient)(url, {
        authType: webdav_1.AuthType.Password,
        username,
        password,
    });
}
async function searchMusic(query) {
    var _a, _b;
    const client = getClient();
    if (!cachedData.cacheFileList) {
        const searchPathList = ((_a = cachedData.searchPathList) === null || _a === void 0 ? void 0 : _a.length)
            ? cachedData.searchPathList
            : ["/"];
        let result = [];
        for (let search of searchPathList) {
            try {
                const fileItems = (await client.getDirectoryContents(search)).filter((it) => it.type === "file" && it.mime.startsWith("audio"));
                result = [...result, ...fileItems];
            }
            catch (_c) { }
        }
        cachedData.cacheFileList = result;
    }
    return {
        isEnd: true,
        data: ((_b = cachedData.cacheFileList) !== null && _b !== void 0 ? _b : [])
            .filter((it) => it.basename.includes(query))
            .map((it) => ({
            title: it.basename,
            id: it.filename,
            artist: "未知作者",
            album: "未知专辑",
        })),
    };
}
async function getTopLists() {
    getClient();
    const data = {
        title: "全部歌曲",
        data: (cachedData.searchPathList || []).map((it) => ({
            title: it,
            id: it,
        })),
    };
    return [data];
}
async function getTopListDetail(topListItem) {
    const client = getClient();
    const fileItems = (await client.getDirectoryContents(topListItem.id)).filter((it) => it.type === "file" && it.mime.startsWith("audio"));
    return {
        musicList: fileItems.map((it) => ({
            title: it.basename,
            id: it.filename,
            artist: "未知作者",
            album: "未知专辑",
        })),
    };
}
module.exports = {
    // 保持你修改的插件名
    platform: "WebDAV lrc", 
    author: "猫头猫",
    description: "使用此插件前先配置用户变量",
    userVariables: [
        {
            key: "url",
            name: "WebDAV地址",
        },
        {
            key: "username",
            name: "用户名",
        },
        {
            key: "password",
            name: "密码",
            type: "password",
        },
        {
            key: "searchPath",
            name: "存放歌曲的路径",
        },
    ],
    version: "0.0.3",
    supportedSearchType: ["music"],
    srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/webdav/index.js",
    cacheControl: "no-cache",
    search(query, page, type) {
        if (type === "music") {
            return searchMusic(query);
        }
    },
    getTopLists,
    getTopListDetail,
    async getMediaSource(musicItem) {
        const client = getClient();
        if (!client) return null;

        const url = client.getFileDownloadLink(musicItem.id);
        let rawLrc = "";

        // 尝试方案一：标准格式，把后缀替换为 .lrc (例如：周杰伦 - 那天下雨了.lrc)
        try {
            const lrcId1 = musicItem.id.replace(/\.[^/.]+$/, ".lrc");
            rawLrc = await client.getFileContents(lrcId1, { format: "text" });
        } catch (e) {
            // 没找到标准的 .lrc，静默进入方案二
        }

        // 尝试方案二：如果方案一失败，尝试在原文件名后直接加 .lrc (例如：周杰伦 - 那天下雨了.mp3.lrc)
        if (!rawLrc) {
            try {
                const lrcId2 = musicItem.id + ".lrc";
                rawLrc = await client.getFileContents(lrcId2, { format: "text" });
            } catch (e) {
                // 都没找到，静默失败，自动回退到 MusicFree 的网络搜索
            }
        }

        return {
            url: url,
            // 只要上面任意一个方案成功获取了文本，就会渲染出来
            rawLrc: rawLrc || undefined, 
        };
    },
};
