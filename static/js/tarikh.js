var JDate=function(d){var jdo={}
jdo.set=function(t){if(t<10000000000)t=t*1000;jdo.d=jdo._000(new Date(t));var a=jdo.tarikh(Math.floor(jdo.d.getTime()/1000));jdo.rooz=a[2];jdo.mah=a[1];jdo.sal=a[0]}
jdo._000=function(t){t.setHours(0);t.setMinutes(0);t.setSeconds(0);return t;}
jdo.inp=function(i){return new Date(i).getTime()}
jdo.toString=function(d){return jdo.sal+'/'+jdo.mah+'/'+jdo.rooz}
jdo.getRooz=function(){return['یکشنبه','دوشنبه','سه شنبه','چهار شنبه','پنچ شنبه','جمعه','شنبه'][(jdo.d.getDay())%7]}
jdo.getMah=function(){return["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"][(jdo.mah-1)];}
jdo.getDate=function(){return jdo.rooz;}
jdo.getMonth=function(){return jdo.mah;}
jdo.getYear=function(){return jdo.sal;}
jdo.tarikh=function(u_t){JDE0tab1000=[[1721139.29189,365242.1374,0.06134,0.00111,-7.1E-4],[1721233.25401,365241.72562,-0.05323,0.00907,2.5E-4],[1721325.70455,365242.49558,-0.11677,-0.00297,7.4E-4],[1721414.39987,365242.88257,-0.00769,-0.00933,-6E-5]];JDE0tab2000=[[2451623.80984,365242.37404,0.05169,-0.00411,-5.7E-4],[2451716.56767,365241.62603,0.00325,0.00888,-3E-4],[2451810.21715,365242.01767,-0.11575,0.00337,7.8E-4],[2451900.05952,365242.74049,-0.06223,-0.00823,3.2E-4]];var a=1948320.5;function b(r,l){var f,m;f=r-(0<=r?474:473);m=474+(f-2820*Math.floor(f/2820));return 1+(7>=l?31*(l-1):30*(l-1)+6)+Math.floor((682*m-110)/2816)+365*(m-1)+1029983*Math.floor(f/2820)+(a-1)}var d=new Date(1E3*u_t),e;e=new Number(1E3<d.getYear()?d.getYear():d.getYear()+1900);var g=d.getMonth()+1,h=1721424.5+365*(e-1)+Math.floor((e-1)/4)+-Math.floor((e-1)/100)+Math.floor((e-1)/400)+Math.floor((367*g-362)/12+(2>=g?0:0!=e%4||0==e%100&&0!=e%400?-2:-1)+new Number(d.getDate()))+Math.floor(new Number(d.getSeconds())+60*(new Number(d.getMinutes())+60*new Number(d.getHours()))+0.5)/86400,k,n,p,q,s,t,u,v,w,h=Math.floor(h)+0.5;p=h-b(475,1);q=Math.floor(p/1029983);s=p-1029983*Math.floor(p/1029983);1029982==s?t=2820:(u=Math.floor(s/366),v=s-366*Math.floor(s/366),t=Math.floor((2134*u+2816*v+2815)/1028522)+u+1);k=t+2820*q+474;0>=k&&k--;w=h-b(k,1)+1;n=186>=w?Math.ceil(w/31):Math.ceil((w-6)/30);return([k,n,h-b(k,n)+1]);}
if(typeof d==="undefined"){jdo.set(new Date()/1000)}
else if(typeof d==="string"&&/\+(\d+)[d]/.test(d))jdo.set(((new Date).getTime()/1000)+(parseInt(d.match(/\+(\d+)[d]/)[1])*86400))
else if(typeof d==="string"&&/\-(\d+)[d]/.test(d))jdo.set(((new Date).getTime()/1000)-(parseInt(d.match(/\-(\d+)[d]/)[1])*86400))
else if(typeof d==="object"&&typeof d.getTime==="function"){jdo.set(d.getTime()/1000)}
else jdo.set(jdo.inp(d))
return jdo;}