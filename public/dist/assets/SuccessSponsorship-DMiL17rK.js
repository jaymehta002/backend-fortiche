import{t as p,a as u,bj as h,r as d,j as s,A as m}from"./main-DA-vLYwL.js";import{B as x}from"./Button-eyYpVHNH.js";import"./cn-DUyS5Z8L.js";const y=()=>{var n;const{search:t}=p(),r=new URLSearchParams(t).get("session_id"),c=u(),[a,{isLoading:i,isError:l,data:e}]=h();return d.useEffect(()=>{r&&((async()=>{try{const o=await a({sessionId:r}).unwrap()}catch(o){console.error("Error handling success:",o)}})(),setTimeout(()=>{c(`/brands/messages/${e.sponsorship.influencerId}`)},1e4))},[r,a]),s.jsxs("div",{className:"success-sponsorship",children:[i&&s.jsx(m,{}),l&&s.jsx("p",{children:"Something went wrong"}),e&&s.jsxs("div",{className:"flex w-full h-screen flex-col items-center justify-center gap-4",children:[s.jsx("h1",{className:"text-2xl font-bold",children:"Success!"}),s.jsx("p",{className:"text-lg",children:"Your sponsorship has been successfully processed."}),s.jsx("p",{className:"text-lg",children:"See your chats for more details."}),s.jsx("p",{className:"text-lg",children:"Thank you for your support!"}),((n=e==null?void 0:e.sponsorship)==null?void 0:n.influencerId)&&s.jsxs(s.Fragment,{children:[s.jsx(x,{className:"mt-4  p-2",variant:"primary",onClick:()=>c(`/brands/messages/${e.sponsorship.influencerId}`),children:"Go to chat"}),s.jsx("p",{className:"text-sm",children:"or wait for redirect in 10 seconds"})]})]})]})};export{y as default};
