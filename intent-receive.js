flash("come to receive");

if (!(time && name)) {
    flash("测试");
    wait(3000);
    exit();
}

var date = new Date();
var now = date.getTime();
var timestamp = Date.parse(time);
var remain_time = timestamp - now;
remain_time = Math.max(1000, remain_time);
flash("onetask: remain_time is " + remain_time + ". name is " + name+ ". time is " + time);
