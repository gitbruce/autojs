var myEnergeType = ["线下支付", "行走", "共享单车", "地铁购票", "网络购票", "网购火车票", "生活缴费", "ETC缴费", "电子发票", "绿色办公", "咸鱼交易", "预约挂号"];
var morningTime = 7;//自己运动能量生成时间
var myMinute= 18
//var imagePath = "/storage/emulated/0/storage/emulated/0/autojs/take2.jpg"
var imagePath = "/storage/emulated/0/Documents/autojs/take2.jpg"
var debugMode = false

unlock();
sleep(1000);
mainEntrence();

//解锁
function unlock() {
    if (!device.isScreenOn()) {
        //点亮屏幕
        device.wakeUp();
        sleep(1000);
        //滑动屏幕到输入密码界面
        swipe(500, 1900, 500, 1000, 1000);
        sleep(2000);

        //输入四次 1 （密码为1111） 数字键1的像素坐标为（200,1000）
        click(400, 1645);
        sleep(500);

        click(400, 1880);
        sleep(500);

        click(400, 2100);
        sleep(500);

        click(800, 2350);
        sleep(500);

    }
}
function tLog(msg) {
    toast(msg);
    console.log(msg)
}

function msg(x, y) {
    var w = floaty.rawWindow(
        <frame gravity="center" bg="#77ff0000">
            <text id="text">O</text>
        </frame>
    );

    w.setPosition(x, y);
    w.setSize(25, 25)
    setTimeout(() => {
        w.close();
    }, 2000);
}

function myClick(x, y) {

    log("clicking " + x + "," + y)

    if (debugMode && y) {
        msg(x, y)
    } else {
        click(x, y)
    }

    //    myClick(x, y);

}

/**
 * 获取权限和设置参数
 */
function prepareThings() {
    //setScreenMetrics(1080, 1920);
    //setScreenMetrics(720, 1280);
    //请求截图
    if (!requestScreenCapture()) {
        tLog("请求截图失败");
        exit();
    }
    sleep(0.2 * 1000)
}
/**
 * 设置按键监听 当脚本执行时候按音量减 退出脚本
 */
function registEvent() {
    //启用按键监听
    events.observeKey();
    //监听音量上键按下
    events.onKeyDown("volume_down", function (event) {
        tLog("脚本手动退出");
        exit();
    });
}
/**
 * 获取截图
 */
function getCaptureImg() {
    var img0 = captureScreen();
    if (img0 == null || typeof (img0) == "undifined") {
        tLog("截图失败,退出脚本");
        exit();
    } else {
        return img0;
    }
}
/**
 * 默认程序出错提示操作
 */
function defaultException() {
    tLog("程序当前所处状态不合预期,脚本退出");
    exit();
}
/**
 * 等待加载收集能量页面,采用未找到指定组件阻塞的方式,等待页面加载完成
 */
function waitPage(type) {
    // 等待进入自己的能量主页
    if (type == 0) {
        desc("攻略").findOne();
    }
    // 等待进入他人的能量主页
    else if (type == 1) {
        desc("浇水").findOne();
    }
    //再次容错处理
    sleep(3000);
}
/**
 * 从支付宝主页进入蚂蚁森林我的主页
 */
function enterMyMainPage() {
    //launchApp("支付宝");
    app.startActivity({
        action: "VIEW",
        data: "alipays://platformapi/startapp?appId=60000002"
    });
    tLog("等待支付宝启动");
    sleep(5000)
    //click("蚂蚁森");
    //等待进入自己的主页
    waitPage(0);
}
/**
 * 进入排行榜
 */
function enterRank() {
    log("进入排行榜");
    //滑动到最低端
    swipe(520, 1860, 520, 100, 1000);
    swipe(520, 1860, 520, 100, 1000);
    swipe(520, 1860, 520, 100, 1000);

    clickByDesc("查看更多好友", 0, true, "程序未找到排行榜入口,脚本退出");
    //等待排行榜主页出现
    sleep(1000)

}
/**
 * 从排行榜获取可收集好有的点击位置
 * @returns {*}
 */
function getHasEnergyfriend() {

    var screen = getCaptureImg();
    var p = null;

    if (files.exists(imagePath)) {
        var icon = images.read(imagePath);
        p = findImage(screen, icon, {
            threshold: 0.9
        });
    } else {
        return null;
    }

    if (p != null) {
        tLog("found data=" + p)
        return p;
    } else {
        return null;
    }
}

/**
 * 判断是否好有排行榜已经结束
 * @returns {boolean}
 */
function isRankEnd() {
    return desc("邀请").exists()
}
/**
 * 在排行榜页面,循环查找可收集好友
 * @returns {boolean}
 */
function enterOthers() {
    log("开始检查排行榜");
    var i = 1;
    var ePoint = getHasEnergyfriend();
    log("epoint=" + ePoint)
    //确保当前操作是在排行榜界面
    while (ePoint == null && textEndsWith("好友排行榜").exists()) {
        swipe(520, 1800, 520, 300, 1000);
        sleep(1000);
        ePoint = getHasEnergyfriend();
        i++;
        //检测是否排行榜结束了
        var rankEnd = isRankEnd()

        if (ePoint == null && rankEnd) {
            tLog("others end")
            return false;
        }
        //如果连续32次都未检测到可收集好友,无论如何停止查找(由于程序控制了在排行榜界面,且判断了结束标记,基本已经不存在这种情况了)
        else if (i > 32) {
            tLog("程序可能出错,连续" + i + "次未检测到可收集好友");
            exit();
        }
    }
    if (ePoint != null) {

        //点击位置相对找图后的修正
        log(ePoint.x, ePoint.y);
        click(ePoint.x + 30, ePoint.y + 20);
        waitPage(1);
        log("收集朋友能量")
        collectionEnergy();
        log("收集朋友能量完成")
        //进去收集完后,递归调用enterOthers
        back();
        sleep(1000);
        var j = 0;
        //等待返回好有排行榜
        if (!textEndsWith("好友排行榜").exists() && j <= 5) {
            sleep(2000);
            j++;
        }
        if (j >= 5) {
            defaultException();
        }
        enterOthers();
    } else {
        defaultException();
    }
}
/**
 * 根据描述值 点击
 * @param energyType
 * @param noFindExit
 */
function clickByDesc(energyType, paddingY, noFindExit, exceptionMsg) {
    if (descEndsWith(energyType).exists()) {
        descEndsWith(energyType).find().forEach(function (pos) {
            var posb = pos.bounds();
            click(posb.centerX(), posb.centerY() - paddingY);
            sleep(2000);
        });
    } else {
        if (noFindExit != null && noFindExit) {
            if (exceptionMsg != null) {
                tLog(exceptionMsg);
                exit();
            } else {
                defaultException();
            }
        }
    }
}
/**
 * 根据text值 点击 * @param energyType * @param noFindExit
 */
function clickByText(energyType, noFindExit, exceptionMsg) {
    if (textEndsWith(energyType).exists()) {
        textEndsWith(energyType).find().forEach(function (pos) {
            var posb = pos.bounds();
            myClick(posb.centerX(), posb.centerY() - 60);
        });
    } else {
        if (noFindExit != null && noFindExit) {
            if (exceptionMsg != null) {
                tLog(exceptionMsg);
                exit();
            } else {
                defaultException();
            }
        }
    }
}

function collectionEnergy() {
    log("收集能量:" + descStartsWith("收集能量").exists())
    if (descStartsWith("收集能量").exists()) {
        descStartsWith("收集能量").find().forEach(function (pos) {
            var posb = pos.bounds();
            myClick(posb.centerX(), posb.centerY() - 20);
            sleep(1000);
        });
    }
    log("能量收集完成");
}

/**
 * 遍历能量类型,收集自己的能量
 */
function collectionMyEnergy() {
    log("收集自己能量")
    sleep(3000);
    myClick(600, 400)
    collectionEnergy()
    //myClick(658,635)
    log("收集自己能量完成")
}
/**
 * 结束后返回主页面
 */
function whenComplete() {
    sleep(1000);
    back();
    sleep(1000);
    back();
    tLog("结束");
}
/**
 * 根据能量类型数组生成我的能量类型正则查找字符串
 * @returns {string}
 */
function generateCollectionType() {
    var regex = "/";
    myEnergeType.forEach(function (t, num) {
        if (num == 0) {
            regex += "(\\s*" + t + "$)";
        } else {
            regex += "|(\\s*" + t + "$)";
        }
    });
    regex += "/";
    return regex;
}

function isMorningTime() {
    var now =new Date();
    var hour=now.getHours();
    var minute=now.getMinutes();
    if(morningTime==hour && minute<32){
      return true;
    }else{
      return false;
    }
}

function isMyTime() {
    var now =new Date();
    var hour=now.getHours();
    var minute=now.getMinutes();

    if(morningTime==hour && myMinute==minute){
      return true;
    }else{
      return false;
    }
}

function collectAll() {
    //收集自己的能量
    collectionMyEnergy();
    //进入排行榜
    enterRank();
    //在排行榜检测是否有好有的能量可以收集
    //    collectionEnergy()    
    enterOthers();
    back();
    sleep(1000);
    back();
    sleep(1000);
    back();
}

function productionMode() {
    debugMode = false

    //前置操作
    prepareThings();
    //注册音量下按下退出脚本监听
    registEvent();

    var i = 0;
    var myTime= 0
    while (i < 1 || isMorningTime()) {
        //从主页进入蚂蚁森林主页
        if(myTime == 0){
          enterMyMainPage();
        }
        if(isMyTime()){
          collectionMyEnergy();
          sleep(5 * 1000)
          myTime = 1;
          i = i + 1
          tLog("collecting My energy round "+ i)
          continue;
        }else{
          myTime = 0
          collectAll();
        }
        tLog("round " + i + " finished")
        sleep(10 * 1000)
        i = i + 1
    }
    //结束后返回主页面
    whenComplete();
    exit();
}

function testMode() {
    debugMode = true
    //前置操作
    prepareThings();
    //collectionMyEnergy();

    collectionEnergy();
}

//程序主入口
function mainEntrence() {
    device.vibrate(1000)
    log(device.height, device.width);

    productionMode();
    // testMode();
}