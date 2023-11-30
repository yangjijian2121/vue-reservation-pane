<template>
    <div style="margin:20px;">
        <div class="time_select">
            <el-cascader v-model="startTime" :options="pickerDateOptions" :props="pickerProps" @change="startTimeSelect" />
            ------------
            <el-cascader v-model="endTime" :options="pickerDateOptions" :props="pickerProps" @change="endTimeSelect" />
        </div>
        <div style="display:flex;margin:20px 50px;font-size:18px;justify-content:space-between;">

            <div style="display:flex;">
                <div style="background-color:#C8C9CC;width:40px;height:20px;margin-right:10px;"></div>
                <div>不可预约</div>
            </div>
            <div style="display:flex;">
                <div style="background-color:#ffa4a4;width:40px;height:20px;margin-right:10px;"></div>
                <div>已有预约</div>
            </div>
            <div style="display:flex;">
                <div style="background-color:#3EA7F1;width:40px;height:20px;margin-right:10px;"></div>
                <div>当前预约</div>
            </div>
        </div>
        <div style="overflow: auto;height:430px ;">
            <div v-for="day in week" ref="box" >
                <div :id="getDayChname(day.date)" class="dalyTitle">{{ getDayChname(day.date) }}</div>
                <div style="height:320px" class="button_wrap">
                    <div v-for="(item, index) in day.timeArr" :key="index" class="button_container">
                        <div class="blueLine" v-show="checkShowBlueLine(day, item, index)"></div>
                        
                        <el-button @click="changTime(day, item, index) " :updateKey="updateKey"
                            :type="item.status == 0 ? '' : item.status == 1 ? 'danger' : item.status == 2 ? 'info' : 'primary'"
                            :disabled="item.status == 1 || item.status == 2" class="button_style">
                            {{ item.time }}
                        </el-button>
                    </div>
                </div>
            </div>
        </div>
        <div  style="margin:15px 0;">
            <span style="margin:0 10px;">备注:</span>
            <el-input v-model="note" style="width: 600px;"> </el-input>
        </div>
    </div>
    <div style="position: relative;float: right;display: flex;justify-content: end;" class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" style="margin-right:10px;" @click="orderMachine">确定</el-button>
    </div>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue';
import { ElMessage,ElMessageBox  } from 'element-plus';
import { defineEmits } from 'vue';
import axios from "axios";
import { remoteGlobal } from "../data/etc.js";
const emit = defineEmits(["changeVi"]);
const props = defineProps({
    DisabledTime: {
        type: Array,
        default: () => []
    },
    
    Machine:{
        type: String,
        default: () => ""
    },
    Plroot:{
        type: String,
        default: () => ""
    },
    CloudSend:{
        type: Object,
        default: () => {}
    },
    Type:{
        type: String,
        default: () => ""
    },
})
const internalDisabledTime = ref(props.DisabledTime);
console.log(internalDisabledTime.value)
const closeDialog = () => {
    emit("changeVi", false);
}
const updateKey = ref(false);
const startTime = ref([] as any[]);
const endTime = ref([] as any[]);
const pickerDateOptions = ref([] as any[]);
const box = ref(null); //页面滚动的box
const startTimeSelect = (val:any) =>{
    console.log(val) //["2023-10-26 周四","16:30"]
    if(val.length == 0){
        return;
    }
    // 链接两个时间
    resetTimeArray();
    // 已经选择过endTime了,需要判断时间大小
    if(endTime.value.length !==0){
        if(!AealerBTime(val,endTime.value)){
            ElMessage.error("起始时间不能小于结束时间");
            resetTimeArray();
            startTime.value = [];
            return;
        }

        appointTimeArr.value[0] = getDeepTime(val[0].split(" ")[0], val[1]);
        for (let i = 0; i < internalDisabledTime.value.length; i++) {
            let singleDisabledTime = new Date(Date.parse(internalDisabledTime.value[i] as string));
            if (
                (appointTimeArr.value[0].getTime() < singleDisabledTime.getTime() &&
                    appointTimeArr.value[1].getTime() > singleDisabledTime.getTime()) 
            ){
                ElMessage.error("不可预约,时间段内有已预约的实验");
                appointTimeArr.value.unshift();
                startTime.value = [];
                return;
            }
        }
        for (let i = 0; i < week.value.length; i++) {
            let timeArr = week.value[i].timeArr;
            for (let j = 0; j < timeArr.length; j++) {
                let timeStr = timeArr[j].time;
                let depCpyTime = getDeepTime(week.value[i].date, timeStr);
                // 确保第二次点击的按钮在第一次之后 按时间判断
                if (depCpyTime.getTime() >= appointTimeArr.value[0].getTime() && depCpyTime.getTime() <= appointTimeArr.value[1].getTime()) {
                    timeArr[j].status = 3;
                }
            }
        }
    }
    
    for(let i=0;i<week.value.length;i++){
        let timeArr = week.value[i].timeArr;
        let dayOfWeek = week.value[i].date;
        if(formatDateTime2(dayOfWeek)[0] == val[0]){
            for(let j=0;j<timeArr.length;j++){
                if(val[1] == timeArr[j].time){
                    // changTime(week.value[i], timeArr[j], j);
                    let day = week.value[i];
                    appointTimeArr.value[0] = getDeepTime(dayOfWeek, timeArr[j].time);
                    // day.timeArr[index].status = 3;
                    day.timeArr[j].status = 3;
                    const dom = document.getElementById(getDayChname(dayOfWeek));
                    dom?.scrollIntoView();
                    return;
                }
            }
            break;
        }
    }
}
const endTimeSelect = (val:any) =>{
    if(val.length == 0){
        return;
    }
    if(startTime.value.length == 0){
        ElMessage.error("请先选择开始时间");
        endTime.value = [];
        return;
    }
    // 和startTime比较时间大小,不可以比startTime小

    if(!AealerBTime(startTime.value,val)){
        ElMessage.error("结束时间不可小于开始时间");
        endTime.value = [];
        resetTimeArray();
        startTimeSelect(startTime.value); //点击一下第一条
        
        return;
    }

    console.log("endTimeSelect" + val)

    for(let i=0;i<week.value.length;i++){
        let timeArr = week.value[i].timeArr;
        let dayOfWeek = week.value[i].date;
        console.log(formatDateTime2(dayOfWeek)[0])
        console.log(val[0])
        if(formatDateTime2(dayOfWeek)[0] == val[0]){
            for(let j=0;j<timeArr.length;j++){
                if(val[1] == timeArr[j].time){
                    // changTime(week.value[i], timeArr[j], j);
                    let day = week.value[i];

                    appointTimeArr.value[1] = getDeepTime(dayOfWeek, timeArr[j].time);
                    // day.timeArr[index].status = 3;
                    day.timeArr[j].status = 3;
                    resetTimeArray();
                    // 链接两个时间
                    for (let i = 0; i < internalDisabledTime.value.length; i++) {
                        let singleDisabledTime = new Date(Date.parse(internalDisabledTime.value[i] as string));
                        if (
                            (appointTimeArr.value[0].getTime() < singleDisabledTime.getTime() &&
                                appointTimeArr.value[1].getTime() > singleDisabledTime.getTime()) 
                        ){
                            ElMessage.error("不可预约,时间段内有已预约的实验");
                            appointTimeArr.value.pop();
                            endTime.value = [];
                            startTimeSelect(startTime.value); //点击一下第一条
                            return;
                        }
                    }
                    // 连接第一次和第二次之间的按钮(包含跨天的所有值)
                    console.log(appointTimeArr.value)
                    for (let i = 0; i < week.value.length; i++) {
                        let timeArr = week.value[i].timeArr;
                        for (let j = 0; j < timeArr.length; j++) {
                            let timeStr = timeArr[j].time;
                            let depCpyTime = getDeepTime(week.value[i].date, timeStr);
                            if (depCpyTime.getTime() >= appointTimeArr.value[0].getTime() && depCpyTime.getTime() <= appointTimeArr.value[1].getTime()) {
                                timeArr[j].status = 3;
                            }
                        }
                    }
                    const dom = document.getElementById(getDayChname(dayOfWeek));
                    dom?.scrollIntoView();
                    return;
                }
            }
            break;
        }
    }
}
const pickerProps = {
    label: 'time',
    value: 'time',
    children:'timeArr'
}

function replaceKeyInJson(jsonObject:any, oldKey:string, newKey:string) {
    let DeepJsonObject = JSON.parse(JSON.stringify(jsonObject));
    for (let i = 0; i < DeepJsonObject.length; i++) {
        const obj = DeepJsonObject[i];
        obj.date = getDayChname(obj.date)
        if (obj.hasOwnProperty(oldKey)) {
            obj[newKey] = obj[oldKey];
            delete obj[oldKey];
        }
        for(let j = 0; j < obj.timeArr.length; j++){
            const obj2 = obj.timeArr[j];
            if(obj2.status !== 0){
                obj2.disabled = true;
            }
        }
    }
    return DeepJsonObject;
}

const appointTimeArr = ref([] as any[]);
const currentTime = ref(new Date());
const currentDay = ref(new Date(currentTime.value).getDate());
const currentMonth = ref(new Date(currentTime.value).getMonth());
const currentYear = ref(new Date(currentTime.value).getFullYear());

const week = ref([] as any[]);

onMounted(() => {
    initTimeArray();
});


// 点击时间按钮框选范围 增加上方时间联动
const changTime = (day: any, val: any, index: number) => {
    let timeArr = day.timeArr;
    // console.log(day,val,index)
    let chooesdTime = getDeepTime(day.date, val.time);
    if (appointTimeArr.value.length === 2) {
        // 第三次点击，重置之前的内容
        appointTimeArr.value.length = 0;
        startTime.value = [];
        endTime.value = [];
        resetTimeArray();
    }
    if (appointTimeArr.value.length === 0) {
        // 第一次点击
        appointTimeArr.value.push(chooesdTime);
        // 启动时间联动
        startTime.value = formatDateTime2(chooesdTime);
        // 把当前按钮的状态置为3
        day.timeArr[index].status = 3;
    } else if (appointTimeArr.value.length === 1) {
        // 第二次点击
        // 如果第二次点击在第一次点击之前 将第二次点击设为第一次
        if (chooesdTime.getTime() < appointTimeArr.value[0].getTime()) {
            // 把上一个按钮的状态置为0
            setBtnStat(appointTimeArr.value[0], 0);
            // 把当前按钮的状态置为3
            day.timeArr[index].status = 3;
            appointTimeArr.value[0] = chooesdTime;
            startTime.value = formatDateTime2(chooesdTime);
            return;
        }
        appointTimeArr.value.push(chooesdTime);
        endTime.value = formatDateTime2(chooesdTime);
        for (let i = 0; i < internalDisabledTime.value.length; i++) {
            let singleDisabledTime = new Date(Date.parse(internalDisabledTime.value[i] as string));
            if (
                (appointTimeArr.value[0].getTime() < singleDisabledTime.getTime() &&
                    appointTimeArr.value[1].getTime() > singleDisabledTime.getTime()) 
            ){
                // 把上一个按钮的状态置为0
                setBtnStat(appointTimeArr.value[0], 0);
                // 把当前按钮的状态置为3
                timeArr[index].status = 3;
                appointTimeArr.value.shift();
                startTime.value = formatDateTime2(chooesdTime);
                endTime.value = [];
                return;
            }
        }
        // 连接第一次和第二次之间的按钮(包含跨天的所有值)
        for (let i = 0; i < week.value.length; i++) {
            let timeArr = week.value[i].timeArr;
            for (let j = 0; j < timeArr.length; j++) {

                let timeStr = timeArr[j].time;
                let depCpyTime = getDeepTime(week.value[i].date, timeStr);
                // 确保第二次点击的按钮在第一次之后 按时间判断
                if (depCpyTime.getTime() >= appointTimeArr.value[0].getTime() && depCpyTime.getTime() <= appointTimeArr.value[1].getTime()) {
                    timeArr[j].status = 3;
                }
            }
        }
    }
    // console.log(timeArr[index]);
    // console.log(appointTimeArr.value)
};
// 根据时间设置查找按钮并设置按钮状态
const setBtnStat = (date: any, stat: number) => {
    // date: 传入的需要查找对应的值
    // stat: 需要设置的状态
    for (let i = 0; i < week.value.length; i++) {
        let timeArr = week.value[i].timeArr;
        let weekDate = week.value[i].date;
        for (let j = 0; j < timeArr.length; j++) {
            let timeStr = timeArr[j].time;
            let depCpyTime = getDeepTime(weekDate, timeStr);
            if (depCpyTime.getTime() == date.getTime()) {
                timeArr[j].status = stat;
                return;
            }
        }
    }

}
// 设置每天的时间状态
const getDaysInfo = (val: any, index: number) => {
    // console.log("getWeek Info")
    // val: {date: Date, is_active: number} Date是当前日期
    // index: number 0-6 7天中的某天

    // 判断时间是不是已经超过了 是则不可预约
    let timeArr = week.value[index].timeArr;
    let nowTime = new Date(currentTime.value);
    for (let i = 0; i < timeArr.length; i++) {
        let timeStr = timeArr[i].time;
        let depCpyTime = getDeepTime(val.date, timeStr, false); //不可以约现在的30分钟内
        // 只有第一个需要设置
        if (depCpyTime.getDate() == nowTime.getDate() && depCpyTime.getTime() < nowTime.getTime()) {
            week.value[index].timeArr[i].status = 2;
        }
    }
    // 判断时间是不是在DisabledTime内 是则不可预约
    for (let i = 0; i < timeArr.length; i++) {
        for (let j = 0; j < internalDisabledTime.value.length; j++) {
            let timeStr = timeArr[i].time;
            let depCpyTime = getDeepTime(val.date, timeStr);
            let singleDisabledTime = new Date(Date.parse(internalDisabledTime.value[j] as string));
            if (depCpyTime.getTime() == singleDisabledTime.getTime()) {
                timeArr[i].status = 1;
                break;
            }
        }
    }
};

// 初始化七天的时间数组
const initTimeArray = async () => {
    currentTime.value = await getCurrentTime();
    // currentTime.value = "2023-1-1 14:15:10";
    currentDay.value = new Date(currentTime.value).getDate();
    currentMonth.value = new Date(currentTime.value).getMonth();
    currentYear.value = new Date(currentTime.value).getFullYear();

    week.value = [];
    for (let i = 0; i < 7; i++) {
        let date = new Date(currentYear.value, currentMonth.value, currentDay.value + i);
        week.value.push({
            date: date,
            is_active: 0,
            timeArr: [
                { time: "00:00", status: 0 },
                { time: "00:30", status: 0 },
                { time: "01:00", status: 0 },
                { time: "01:30", status: 0 },
                { time: "02:00", status: 0 },
                { time: "02:30", status: 0 },
                { time: "03:00", status: 0 },
                { time: "03:30", status: 0 },
                { time: "04:00", status: 0 },
                { time: "04:30", status: 0 },
                { time: "05:00", status: 0 },
                { time: "05:30", status: 0 },
                { time: "06:00", status: 0 },
                { time: "06:30", status: 0 },
                { time: "07:00", status: 0 },
                { time: "07:30", status: 0 },
                { time: "08:00", status: 0 },
                { time: "08:30", status: 0 },
                { time: "09:00", status: 0 },
                { time: "09:30", status: 0 },
                { time: "10:00", status: 0 },
                { time: "10:30", status: 0 },
                { time: "11:00", status: 0 },
                { time: "11:30", status: 0 },
                { time: "12:00", status: 0 },
                { time: "12:30", status: 0 },
                { time: "13:00", status: 0 },
                { time: "13:30", status: 0 },
                { time: "14:00", status: 0 },
                { time: "14:30", status: 0 },
                { time: "15:00", status: 0 },
                { time: "15:30", status: 0 },
                { time: "16:00", status: 0 },
                { time: "16:30", status: 0 },
                { time: "17:00", status: 0 },
                { time: "17:30", status: 0 },
                { time: "18:00", status: 0 },
                { time: "18:30", status: 0 },
                { time: "19:00", status: 0 },
                { time: "19:30", status: 0 },
                { time: "20:00", status: 0 },
                { time: "20:30", status: 0 },
                { time: "21:00", status: 0 },
                { time: "21:30", status: 0 },
                { time: "22:00", status: 0 },
                { time: "22:30", status: 0 },
                { time: "23:00", status: 0 },
                { time: "23:30", status: 0 },
            ]
        });
        getDaysInfo(week.value[i], i);
    }
    // console.log(week.value)
    // 深拷贝pickerDateOptions 用于初始化时间选择器 修改第一层的date为time
    pickerDateOptions.value = replaceKeyInJson(week.value, "date", "time");
    // console.log(pickerDateOptions.value)
}
// 重置时间数据
const resetTimeArray = () => {

    for (let i = 0; i < week.value.length; i++) {
        for (let j = 0; j < week.value[i].timeArr.length; j++) {
            week.value[i].timeArr[j].status = 0;
        }
        getDaysInfo(week.value[i], i);
    }

    
    updateKey.value = !updateKey.value;
}

// "2023-10-22T16:00:00.000Z" => "2023-10-22 周日"
const getDayChname = (date: Date) => {
    date = new Date(date);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let dateCn = `${year}-${month}-${day} ${getDayOfWeek(date)}`;
    return dateCn;
}
// 获取这一天是周几
const getDayOfWeek = (date: Date) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
}

// 返回时间 一般用于对比 入参: 2021-10-22,16:00,false 
const getDeepTime = (date: Date, hourmin: string, addThirty: boolean = false) => {
    let timeParts = hourmin.split(":");
    let depCpyTime = new Date(date);
    depCpyTime.setHours(Number(timeParts[0]));
    if (addThirty) {
        depCpyTime.setMinutes(Number(timeParts[1]) + 30);
    }
    else {
        depCpyTime.setMinutes(Number(timeParts[1]));
    }
    return depCpyTime;
}
// date=>2021-10-22 16:00
function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1); 
  const day = String(date.getDate()).padStart(2,"0"); // 补0
  const hours = String(date.getHours()).padStart(2, '0'); // 补0
  const minutes = String(date.getMinutes()).padStart(2, '0'); // 补0

  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

  return formattedDateTime;
}
// date=>["2023-10-27 周五","00:30"]
function formatDateTime2(date: Date) {
    // 格式化日期部分
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1);
    const day = String(date.getDate());
    const dayOfWeek = getDayOfWeek(date)

    // 格式化时间部分
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${dayOfWeek}`;
    const formattedTime = `${hours}:${minutes}`;

    return [formattedDate, formattedTime];
}
// ["2023-10-27 周五","00:30"] 和 ["2023-10-27 周五","11:30"] 比较大小
function AealerBTime(timeArrayA:any[],timeArrayB:any[]){
    let timeAString = timeArrayA[0].split(" ")[0]
    let timeBString = timeArrayB[0].split(" ")[0]
    let timeA = getDeepTime(timeAString,timeArrayA[1]);
    let timeB = getDeepTime(timeBString,timeArrayB[1]);
    console.log(timeA)
    console.log(timeB)
    if(timeA.getTime() < timeB.getTime()){
        return true;
    }
    return false;
}
// 是否显示蓝色线条
const checkShowBlueLine = (day:any, item: any, index: number) => {
    // day+item 是appointTimeArr[0] false
    if(appointTimeArr.value.length !==2){
        return false;
    }
    if(item.status == 3 && (index)%7 !==0 &&(index !==0)){
        let newDate = getDeepTime(day.date, item.time)
        let oldDate = new Date(appointTimeArr.value[0]);
        if(newDate.getTime() ==  oldDate.getTime()){
            return false;
        }
        return true;
    }
    return false;
}

const token = localStorage.getItem("token")

// 获取真实时间
const getCurrentTime = async () => {
    try {
        const response = await axios({
            method: "post",
            url: remoteGlobal.baseApi + "/get_currentTime.php",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: {
                token: token,
            }
        });
        let recv = response.data;
        if (recv.status == "error") {
            ElMessage.error(recv.log as string);
        }
        return recv.log;
    } catch (error) {
        console.log(error);
        throw new Error("Net error");
    }
}
// 计算时间差(有多少个半小时)
const getAppointTimeArrLength = (appointTimeArr: any[]) => {
    if (appointTimeArr.length !== 2) {
        // 确保数组包含两个元素
        return 0;
    }

    const startTime = new Date(appointTimeArr[0]);
    const endTime = new Date(appointTimeArr[1]);

    // 计算时间差（以毫秒为单位）取绝对值
    const timeDifference = Math.abs(endTime.getTime() - startTime.getTime());

    // 将毫秒转换为半小时（1800000 毫秒为半小时）
    const halfHoursDifference = timeDifference / 1800000;

    return halfHoursDifference;
}

// 发送预定相关参数
const note = ref("");
const orderMachine = () =>{
    console.log(props.Type)
    if(props.Type == 'server'){
        orderCloudServer();
    }
    else{
        axios({
            method: "post",
            url: remoteGlobal.baseApi + "/order_insert.php",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data:{
                token:token,
                Machine:props.Machine,
                Plroot:props.Plroot,
                Type:'1',
                Userid:localStorage.getItem("userid"),
                StartTime:formatDateTime(appointTimeArr.value[0]),
                Sustain:getAppointTimeArrLength(appointTimeArr.value),
                Notes:note.value,
            }
        }).then(function (_res) {
            let recv = _res.data;
            if (recv.status == "error") {
                ElMessage.error(recv.log as string);
            }
            else{
                ElMessage.success("预约成功");
                emit("changeVi", false);
            }
        }).catch(function (_err) {
            ElMessage.error("网络错误");
            console.log(_err)
        })
    }
}

const orderCloudServer = async() =>{
    let OrderStartTime = formatDateTime(appointTimeArr.value[0]);
    let OrderSustain = getAppointTimeArrLength(appointTimeArr.value);
    
    let serverList = await getServerTime(OrderStartTime,OrderSustain);
    console.log(serverList)
    if(serverList.length == 0){
        ElMessage.error("serverList为0,请检查");
        return;
    }
    for(let i=0;i<serverList.length;i++){
        let SusTime = serverList[i].SusTime;
        let UnionTime = serverList[i].UnionTime;
        let OrderCloudServerID = serverList[i].OrderCloudServerID;
        // 判断SusTime 是否满足
        for(let j=0;j<SusTime.length;j++){
            // 在可预约时间范围内
            console.log(OrderStartTime,OrderSustain)
            console.log( SusTime[j].Start,SusTime[j].Sustain)
            if(OrderStartTime == SusTime[j].Start && OrderSustain == SusTime[j].Sustain){
                axios({
                    method: "post",
                    url: remoteGlobal.baseApi + "/order_server_insert.php",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data:{
                        token:token,
                        
                        OrderStartTime:OrderStartTime,
                        OrderSustain:OrderSustain,
                        OrderNotes:note.value,
                        OrderCloudServerID:OrderCloudServerID,
                        OrderProjectID:props.CloudSend.OrderProjectID,
                        ProjectCpu:props.CloudSend.ProjectCpu,
                        ProjectGpu:props.CloudSend.ProjectGpu,
                        ProjectMem:props.CloudSend.ProjectMem,
                    }
                }).then(function (_res) {
                    let recv = _res.data;
                    if (recv.status == "error") {
                        ElMessage.error(recv.log as string);
                    }
                    else{
                        ElMessage.success("预约成功");
                        emit("changeVi", false);
                    }
                }).catch(function (_err) {
                    ElMessage.error("网络错误");
                    console.log(_err)
                })
            }
            // 可预约范围内没有可选项
            else{
                ElMessageBox.confirm(
                    "当前时间段无可预约时间"+
                    "推荐时间: " + UnionTime[0].Start + " - " + UnionTime[0].End,
                    {
                        confirmButtonText: 'OK',
                        cancelButtonText: 'Cancel',
                    }
                )
                .then(() => {
                    
                })
                .catch(() => {
                   
                })
                console.log()
            }
            return;
        }
    }
    ElMessage.error("当前时间段无可预约时间");
}

const getServerTime = async(OrderStartTime:string,OrderSustain:number) =>{
    try {
        const response = await axios({
            method: "post",
            url: remoteGlobal.baseApi + "/order_server_available_time.php",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: {
                token: token,
                OrderStartTime:OrderStartTime,
                OrderSustain:OrderSustain,
                OrderProjectID:props.CloudSend.OrderProjectID,
            }
        });
        return response.data.data;
    } catch (error) {
        console.log(error);
        throw new Error("Net error");
    }
}

</script>

<style scoped>
.time_select{
    display: flex;
    position: relative;
    height: 30px;
    justify-content: space-around;
    align-items: center;
    margin: 20px 0;
}
.top:hover {
    cursor: pointer;
    user-select: none;
}

.top_style,
.top_active {
    border: 1px solid #AAA;
    padding: 3px 20px;
    text-align: center;
}

.top_active {
    border-color: #02A7F0;
    color: #02A7F0;
}

.button_style {
    text-align: center;
    float: left;
    width: 80px;
}

.el-button {
    margin-left: 10px;
}

.button_wrap {
    margin: 20px 20px;
    ;
    width: 630px;
    display: flex;
    flex-wrap: wrap;
    font-size: 18px;
    justify-content: flex-start;
    margin-bottom: 20px;
}

.dalyTitle {
    margin: 20px 50px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
}
.button_container{
    position: relative;
}
.blueLine{
    width: 11px;
    height: 2px;
    background-color: #409eff;
    position: absolute;
    left: -10px;
    top: 15px;
    display: inline-block;
    margin: 0 10px;
}
</style>
