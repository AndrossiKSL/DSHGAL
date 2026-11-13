# 之后同步新美术

当前运行资产是 2.2 基线：22 位角色、264 张完整动作，三套群像封面，UI 1.7 与已完成的服装素材。原生生图索引见 art-import.json。新增 352 张动作仍是生产计划，不计作成品。

本轮只移动和封包这份快照，不扫描正在生成的新素材。后续将生产目录作为显式参数导入；不要在运行时监听个人生图目录。

```sh
npm run import:art -- --asset-root PROCESSED_ART_ROOT --portrait-source NATIVE_PORTRAITS --ui-source NATIVE_UI
node scripts/sync-signal-ui.mjs APPROVED_UI_ROOT
npm run verify
npm run package:desktop
npm run package:share
```

动作资源保留 1024×1536 画布与 (512,1500) 锚点。现有角色、动作和素材键不要重排；新增键需同步清单、哈希及必要的前端使用处。缺少图片的 plannedFrames 只能保留为计划记录。

assets/source 是可选的本地原稿位置，默认不入 Git 和分享包。运行只读取 assets/default 和 packs 的明确白名单。保留作者、上游设计与逐文件许可；不把生成改绘视为消除了原许可条件。

新的美术和代码需要重新制作 EXE 才会进入桌面版；网页版与桌面版更新的区别见 UPDATING.md。README 的修改本身不需要重打游戏包。
