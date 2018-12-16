log("come to send");
var next_alert_date = "Wed Nov 28 2018 23:35:48";

this.notifyTasker = function (time) {
    log("已发送Tasker任务：" + time);
    app.sendBroadcast({
        action: "net.dinglisch.android.tasker.ActionCodes.RUN_SCRIPT",
        extras: {
            name: "蚂蚁森林",
            time: time,
            minute: '5'
        }
    });
};

this.notifyTasker(next_alert_date);