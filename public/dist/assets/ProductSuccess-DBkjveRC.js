import{r,C as f,_ as n,j as e,A as m}from"./main-DA-vLYwL.js";const p=()=>{const t=new URLSearchParams(window.location.search).get("session_id"),[g,o]=r.useState(!1),[i,{isLoading:l}]=f(),[u,c]=r.useState(!1),a=r.useRef(!1);r.useEffect(()=>{!a.current&&t&&(a.current=!0,d(t),localStorage.setItem("cart",JSON.stringify([])))},[t]);const d=async h=>{if(!u)try{c(!0);const s=await i({session_id:h});if(s.data.success==="true"&&o(!0),"error"in s){n.error(s.error.data.message);return}}catch(s){n.error(s.message||"Something went wrong")}finally{c(!1)}};return e.jsx(e.Fragment,{children:l?e.jsx(m,{}):e.jsxs("div",{className:"flex flex-col items-center justify-center bg-white-pure h-screen text-center",children:[e.jsx("div",{className:"text-2xl font-semibold text-black mb-4",children:"Thank You For Your Purchase!"}),e.jsx("div",{className:"w-16 h-16 flex items-center justify-center mb-4",children:e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"50",height:"50",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:"lucide lucide-circle-check-big",children:[e.jsx("path",{d:"M21.801 10A10 10 0 1 1 17 3.335"}),e.jsx("path",{d:"m9 11 3 3L22 4"})]})}),e.jsx("div",{className:"text-lg font-bold text-black mb-2",children:"Payment Successfully Processed"}),e.jsx("div",{className:"text-gray-600 mb-2",children:"Your order has been confirmed and will be processed shortly"}),e.jsx("a",{href:"/",className:"text-pink-500 hover:underline",children:"Return Dashboard"})]})})};export{p as default};
