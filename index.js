import DateTime from './DateTime.vue';
const DateTimePlugin = {
    install(Vue) {
        Vue.component('DateTime', DateTime);
    }
};
export default DateTimePlugin;
