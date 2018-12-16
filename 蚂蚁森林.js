/**
 * 使用说明请看 https://github.com/e1399579/autojs/blob/master/README.md
 * @author ridersam <e1399579@gmail.com>
 */
auto(); // 自动打开无障碍服务
var config = files.isFile("config.js") ? require("config.js") : {};
var waitMySeconds = 60 * 1000
var lateHour = 22
var earlyHour = 7

if (typeof config !== "object") {
    config = {};
}
var options = Object.assign({
    password: "",
    pattern_size: 3
}, config); // 用户配置合并

// 所有操作都是竖屏
const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);
const IS_ROOT = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su");

setScreenMetrics(WIDTH, HEIGHT);
start(options);


function unlock() {
    //滑动屏幕到输入密码界面
    swipe(500, 1900, 500, 1000, 1000);
    sleep(2000);

    //输入四次 1 （密码为1111） 数字键1的像素坐标为（200,1000）
    click(230, 1275);
    sleep(500);

    click(245, 1460);
    sleep(500);

    click(230, 1640);
    sleep(500);

    click(550, 1830);
    sleep(500);
}
/**
 * 开始运行
 * @param options
 */
function start(options) {
    checkModule();

    var Robot = require("Robot.js");
    var robot = new Robot(options.max_retry_times);
    var antForest = new AntForest(robot, options);
    antForest.saveState();

    while (!device.isScreenOn()) {
        device.wakeUp();
        sleep(1000); // 等待屏幕亮起
        unlock();
    }

    // 连续运行处理
    var taskManager = new TaskManager();
    taskManager.init();
    taskManager.listen();
    taskManager.waitFor();

    // 先打开APP，节省等待时间
    threads.start(function () {
        antForest.openApp();
    });

    antForest.launch();
    antForest.work();
    antForest.resumeState();

    // 退出
    exit();
    throw new Error("强制退出");
}

/**
 * 检查必要模块
 */
function checkModule() {
    if (!files.exists("Robot.js")) {
        throw new Error("缺少Robot.js文件，请核对第一条");
    }

    if (!files.exists("Secure.js") && context.getSystemService(context.KEYGUARD_SERVICE).inKeyguardRestrictedInputMode()) {
        throw new Error("缺少Secure.js文件，请核对第一条");
    }
}

function TaskManager() {
    this.task_no = 0;
    this.time_tag = "start_time";
    this.wait_time = 15000;

    this.init = function () {
        engines.myEngine().setTag(this.time_tag, (new Date()).getTime());

        var task_list = this.getTaskList();
        this.task_no = this.findIndex(engines.myEngine(), task_list);
        log(Object.keys(task_list));
    };

    this.getTaskList = function () {
        return engines.all().sort(function (e1, e2) {
            return e1.getTag(this.time_tag) - e2.getTag(this.time_tag);
        }.bind(this));
    };

    this.findIndex = function (engine, list) {
        var engine_id = engine.id;
        var id_list = list.map(function (o) {
            return o.id;
        });

        return id_list.indexOf(engine_id);
    };

    this.listen = function () {
        // 子线程
        threads.start(function () {
            // 监听音量上键
            events.observeKey();
            events.onceKeyDown("volume_up", function (event) {
                engines.stopAll();
                exit();
            });
        });
    };

    this.waitFor = function () {
        while (1) {
            device.wakeUpIfNeeded();

            var task_no = this.findIndex(engines.myEngine(), this.getTaskList());
            if (task_no > 0) {
                log("任务" + this.task_no + "排队中，前面有" + task_no + "个任务");
                sleep(this.wait_time);
            } else {
                log("任务" + this.task_no + "开始运行");
                break;
            }
        }
    };
}

/**
 * 蚂蚁森林的各个操作
 * @param robot
 * @param options
 * @constructor
 */
function AntForest(robot, options) {
    this.robot = robot;
    options = options || {};
    var settings = {
        timeout: 8000, // 超时时间：毫秒
        max_retry_times: 10, // 最大失败重试次数
        takeImg: "take.png", // 收取好友能量用到的图片
        max_swipe_times: 100, // 好友列表最多滑动次数
        min_time: "7:18:00", // 检测时段
        max_time: "7:18:59",
        check_within_time: 1,
        help_img: ""
    };
    this.options = Object.assign(settings, options);
    this.package = "com.eg.android.AlipayGphone"; // 支付宝包名
    this.state = {};
    this.capture = null;
    this.bounds = [0, 0, WIDTH, 1100];
    this.icon_num = 1;
    this.start_time = (new Date()).getTime();
    this.detected = 0;

    toastLog("即将收取能量，按音量上键停止");

    this.saveState = function () {
        this.state.isScreenOn = device.isScreenOn();
        this.state.currentPackage = currentPackage(); // 当前运行的程序
        this.state.isRunning = IS_ROOT ? parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result) : 0; // 支付宝是否运行
        this.state.version = context.getPackageManager().getPackageInfo(this.package, 0).versionName;
        log(this.state);
    };

    this.resumeState = function () {
        if (this.state.currentPackage !== this.package) {
            this.back(); // 回到之前运行的程序
            sleep(1500);
        }

        if (!this.state.isRunning) {
            this.closeApp();
        }

        if (!this.state.isScreenOn) {
            KeyCode("KEYCODE_POWER");
        }
    };

    this.openApp = function () {
        launch(this.package);
    };

    this.closeApp = function () {
        this.robot.kill(this.package);
    };

    this.launch = function () {
        var times = 0;
        do {
            if (this.doLaunch()) {
                return;
            } else {
                times++;
                this.back();
                sleep(1500);
                this.openApp();
            }
            if (times > 2) {
                launchApp("支付宝");
                log("launch 支付宝");
            }
        } while (times < this.options.max_retry_times);

        throw new Error("运行失败");
    };

    this.doLaunch = function () {
        // 可能出现的红包弹框，点击取消
        var timeout = this.options.timeout;
        threads.start(function () {
            var cancelBtn;
            if (cancelBtn = id("com.alipay.mobile.accountauthbiz:id/update_cancel_tv").findOne(timeout)) {
                cancelBtn.click();
            }
            if (cancelBtn = id("com.alipay.android.phone.wallet.sharetoken:id/btn1").findOne(timeout)) {
                cancelBtn.click();
            }
        });

        log("打开蚂蚁森林");
        app.startActivity({
            action: "VIEW",
            data: "alipays://platformapi/startapp?appId=60000002"
        });

        // 等待加载
        if (this.waitForLoading("种树")) {
            log("进入蚂蚁森林成功");
        } else {
            toastLog("进入蚂蚁森林失败");
            return false;
        }

        return true;
    };

    this.waitForLoading = function (keyword) {
        var timeout = this.options.timeout;
        var waitTime = 200;
        sleep(2000);
        timeout -= 2000;
        for (var i = 0; i < timeout; i += waitTime) {
            if (desc(keyword).exists()) {
                sleep(1000);
                return true;
            }

            sleep(waitTime); // 加载中
        }

        return false;
    };

    this.getPower = function () {
        var energy = descMatches(/\d+g/).findOnce();
        return energy ? parseInt(energy.contentDescription) : null;
    };
    
    this.takeMine = function (startPower) {
        this.take();
        this.takeRemain(this.getRemainList(), this.options.min_time, this.options.max_time);
        sleep(500);
        var power = this.getPower() - startPower;
        if (power > 0) {
            toastLog("收取了" + power + "g自己的能量");
        }    
        return power;
    };

    this.work = function () {
        sleep(1000);
        this.robot.click(WIDTH / 2, 510);

        var timeout = this.options.timeout;
        var startPower = this.getPower();
        log("当前能量：" + startPower);

        // 开始收取
        var my_time = new Date().toDateString() + " " + this.options.min_time;
        var my_datetime = Date.parse(my_time);
        
        while ((my_datetime > new Date().getTime()) && (my_datetime-new Date().getTime()) < waitMySeconds) {
            var power = this.takeMine(startPower);
            if (power > 0) {
                break;
            }
            sleep(500);
        }
        this.takeMine(startPower);

        var icon_list = [];
        var icon = images.read(this.options.takeImg);
        if (null === icon) {
            throw new Error("缺少图片文件，请仔细查看使用方法的第一条！！！");
        }
        icon_list = [icon];
        var icon2;
        if (this.options.help_img && (icon2 = images.read(this.options.help_img))) {
            icon_list[1] = icon2;
        }
        this.icon_num = icon_list.length;

        // 截图权限申请
        threads.start(function () {
            var remember;
            var beginBtn;
            if (remember = id("com.android.systemui:id/remember").checkable(true).findOne(timeout)) {
                remember.click();
            }
            if (beginBtn = classNameContains("Button").textContains("立即开始").findOne(timeout)) {
                beginBtn.click();
            }
        });
        if (!requestScreenCapture(false)) {
            throw new Error("请求截图失败");
        }

        // 跳过当前屏幕
        var y = Math.min(HEIGHT, 1720);
        this.robot.swipe(WIDTH / 2, y, WIDTH / 2, 0);
        sleep(500);
        log("开始收取好友能量");

        var bottom = 0;
        var total_list = this.takeOthers(icon_list, 500, function () {
            var rect = desc("种树").findOnce().bounds();

            if (rect.bottom === bottom) {
                return true;
            }

            bottom = rect.bottom;
            return false;
        });

        // 统计下次时间
        var minuteList = [];
        var keyword = "查看更多好友";
        log('查看更多好友')
        log(desc(keyword).exists())
        if (desc(keyword).exists()) {
            log(keyword);
            if (this.robot.clickCenter(desc(keyword).findOne(timeout))) {
                // 等待更多列表刷新
                if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("好友排行榜").findOne(timeout)) {
                    sleep(1000);
                    log("进入好友排行榜成功");
                    // 跳过第一屏
                    var y = Math.min(HEIGHT, 1720);
                    this.robot.swipe(WIDTH / 2, y, WIDTH / 2, 0);
                    sleep(500);

                    var page, min_minute, add_total_list, swipe_sleep = 500;
                    for (; ;) {
                        log("往下翻页");
                        page = 0;
                        add_total_list = this.takeOthers(icon_list, swipe_sleep, function () {
                            /*var selector = desc("没有更多了");
                            if (!selector.exists()) return false;

                            return selector.findOne().visibleToUser();*/
                            page++;
                            return (page > this.options.max_swipe_times)
                                || (findColorEquals(this.capture, "#30BF6C", WIDTH - 300, 0, 200, HEIGHT) !== null);
                        }.bind(this));
                        this.addTotal(total_list, add_total_list);

                        minuteList = this.statisticsNextTime();
                        this.filterMinuteList(minuteList);

                        if (!minuteList.length) {
                            break;
                        }
                        min_minute = minuteList[0];
                        log("当前最小剩余" + min_minute + "分钟");
                        var selector = desc("没有更多了")
                        if (selector.exists()) {
                            log("排行榜结束");
                            break;
                        }
                        if ((min_minute > this.options.check_within_time) || (page > this.options.max_swipe_times)) {
                            break;
                        }
                        swipe_sleep = 300;

                        //log("往上翻页 "+page);
                        //page = 0;
                        //add_total_list = this.takeOthers(icon_list, swipe_sleep, function () {
                            //page++;
                            //return (page > this.options.max_swipe_time);
                        //}.bind(this), "prev");
                        //this.addTotal(total_list, add_total_list);
                    }

                    this.back();
                    sleep(2000);
                    this.waitForLoading("种树");
                } else {
                    toastLog("进入好友排行榜失败");
                }
            } else {
                toastLog("进入好友排行榜失败");
            }
        } else {
            minuteList = this.statisticsNextTime();
            this.filterMinuteList(minuteList);
        }

        var endPower = this.getPower();

        var added = endPower - startPower;
        added = Math.max(0, added);

        this.back();
        var message = "收取完毕，共" + total_list[0] + "个好友，" + added + "g能量";
        if (this.icon_num > 1) {
            message += "，帮了" + total_list[1] + "个好友收取";
        }
        toastLog(message);
        sleep(1500);

        // 统计部分，可以删除
        var timeList = this.getTimeList(minuteList);
        var date = new Date();
        var today = date.toDateString();
        if (timeList.length) {
            log("可收取时间：" + timeList.join(', '));

            var next_time = today + " " + timeList[0];
            var next_datetime = Date.parse(next_time);
            var now_time = date.getTime();
            var next_minute = Math.ceil((next_datetime - now_time)/60*1000);
            var next_alert_date = next_time;
            log("最近收取时间：" + next_time);
            log("我收取时间：" + my_time);
            if (my_datetime > date.getTime()) {
                if ((my_datetime - waitMySeconds) < next_datetime) {
                    next_alert_date = my_time;
                    next_minute = Math.ceil((my_time - now_time)/60*1000);
                    log("我收取时间：" + my_time);
                }
            }
            this.notifyTasker(next_alert_date, String(minuteList[0]));
        } else {
            var nowHour = date.getHours();
            if ((nowHour < lateHour) && (nowHour > earlyHour)) {
                date.setHours(date.getHours()+1)
                var next_alert_date = this.getDateTimeStr(date);
                log("no more, wait for 1 hour later: " + next_alert_date)
                this.notifyTasker(next_alert_date, 60);
            } else {
                log("too late, wait for tomorrow")
            }
        }
    };

    this.getDateTimeStr = function(aDate) {
        return aDate.toDateString() + " " + aDate.getHours() + ":" + aDate.getMinutes() + ":" + aDate.getSeconds()
    }

    this.addTotal = function (total_list, add_total_list) {
        for (var i = 0; i < this.icon_num; i++) {
            total_list[i] += add_total_list[i];
        }
    };

    this.statisticsNextTime = function () {
        var minuteList = [];
        descMatches(/\d+’/).find().forEach(function (o) {
            minuteList.push(parseInt(o.contentDescription));
        });
        return minuteList;
    };

    this.filterMinuteList = function (minuteList) {
        // 排序
        minuteList.sort(function (m1, m2) {
            return m1 - m2;
        });
        // 去掉重复的
        for (var i = 1, len = minuteList.length; i < len; i++) {
            // 相差1分钟以内认为是同一时间
            if ((minuteList[i] - minuteList[i - 1]) <= 1) {
                minuteList.splice(i--, 1);
                len--;
            }
        }
    };

    this.getTimeList = function (minuteList) {
        var date = new Date();
        var timeList = [];
        var timestamp = date.getTime() - 20000;
        for (var i = 0, len = minuteList.length; i < len; i++) {
            var minute = minuteList[i];
            var now = timestamp + minute * 60 * 1000;
            date.setTime(now);
            timeList.push(date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
        }
        return timeList;
    };

    this.notifyTasker = function (time, minute) {
        app.sendBroadcast({
            action: "net.dinglisch.android.tasker.ActionCodes.RUN_SCRIPT",
            extras: {
                name: "蚂蚁森林",
                time: time,
                minute: minute
            }
        });
        log("已发送Tasker任务：" + time + ", minute:" + minute);
    };

    /**
     * 收取能量
     */
    this.take = function () {
        var filters = className("android.widget.Button").filter(function (o) {
            var desc = o.contentDescription;

            return (null !== desc.match(/^收集能量|^\s?$/));
        }).find();

        var num = filters.length;
        log("找到" + num + "个能量球");
        sleep(100 * num);

        this.robot.clickMultiCenter(filters);

        this.autoBack();
    };

    this.autoBack = function () {
        // 误点了按钮则返回
        sleep(1000);
        if (id("com.alipay.mobile.ui:id/title_bar_title").exists() || text("通知").exists()) {
            this.back();
            sleep(1500);
        }
    };

    /**
     * 获取剩余能量球列表
     */
    this.getRemainList = function () {
        var list = [];
        className("android.widget.Button").filter(function (o) {
            var desc = o.contentDescription;
            if (desc != null) {
                return (null !== desc.match(/^收集能量|^\s?$/));
            } else {
                return false
            }
        }).find().forEach(function (o) {
            var rect = o.bounds();
            list.push([rect.centerX(), rect.centerY()]);
        }.bind(this));

        return list;
    };

    this.takeRemain = function (list, min_time, max_time) {
        var len = list.length;
        if (!len) return;

        var date = new Date();
        var today = date.toDateString();
        var min_timestamp = Date.parse(today + " " + min_time);
        var max_timestamp = Date.parse(today + " " + max_time);
        var now = date.getTime();

        if ((min_timestamp <= now) && (now <= max_timestamp)) {
            toastLog("开始检测剩余能量");
            var millisecond = max_timestamp - now;
            var step_time = 0;
            var use_time = step_time + 156 * len;
            for (var i = 0; i <= millisecond; i += use_time) {
                this.robot.clickMulti(list);

                sleep(step_time);
            }
            this.autoBack();

            this.detected = 1;
            toastLog("检测结束");
        }
    };

    /**
     * 收取好友能量
     * @param icon_list
     * @param isEndFunc
     * @param swipe_sleep
     * @param scroll
     * @returns {Array}
     */
    this.takeOthers = function (icon_list, swipe_sleep, isEndFunc, scroll) {
        var row = (192 * (HEIGHT / 1920)) | 0;
        var total_list = [];
        var take_num = icon_list.length;
        var x1, y1, x2, y2;
        x2 = x1 = WIDTH / 2;
        switch (scroll) {
            case "next":
            default:
                y1 = HEIGHT - row;
                y2 = row;
                break;
            case "prev":
                y1 = row * 1.5;
                y2 = HEIGHT - row;
                break;
        }
        for (var i = 0; i < take_num; i++) {
            total_list[i] = 0;
        }
        while (1) {
            for (var i = 0; i < take_num; i++) {
                var icon = icon_list[i];
                total_list[i] += this.takeFromImage(icon);
            }

            if (isEndFunc()) {
                break;
            }

            this.robot.swipe(x1, y1, x2, y2);
            sleep(swipe_sleep); // 等待滑动动画
        }

        return total_list;
    };

    /**
     * 找图收取
     * @param icon
     * @returns {number}
     */
    this.takeFromImage = function (icon) {
        var point;
        var row_height = HEIGHT / 10;
        var options = {
            region: [WIDTH - row_height, row_height],
            threshold: 0.8
        };
        var total = 0;
        var times = 0;
        var x = WIDTH / 2;
        var offset = icon.getHeight() / 2;
        while (times < this.options.max_retry_times) {
            this.capture = captureScreen();
            if (null === this.capture) {
                toastLog("截图失败");
                times++;
                sleep(200);
                continue;
            }
            point = findImage(this.capture, icon, options);
            if (null === point) {
                break;
            }
            
            var y = point.y + offset;
            this.robot.click(x, y);

            // 等待好友的森林
            var title = "好友森林";
            if (this.waitForLoading("你收取TA")) {
                title = id("com.alipay.mobile.nebula:id/h5_tv_title").findOnce();
                log("进入" + title.text() + "成功");
                total++;

                var cover;
                if (cover = descMatches(/\d{2}:\d{2}:\d{2}/).findOnce()) {
                    toastLog("保护罩还剩" + cover.contentDescription + "，忽略");
                } else {
                    // 收取
                    this.take();
                }
            } else {
                toastLog("进入好友森林失败");
            }

            // 返回好友列表
            this.back();
            sleep(3000);
        }

        return total;
    };

    this.back = function () {
        back();
    };
}
