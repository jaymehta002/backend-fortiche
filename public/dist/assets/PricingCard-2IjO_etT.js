import{aZ as w,w as k,j as r,av as j}from"./main-DA-vLYwL.js";import{B as v}from"./Button-eyYpVHNH.js";const C=({title:c,plan:s,subtitle:i,price:m,priceTitle:h,features:x,isCurrentPlan:t,isSelected:g,onSelect:u})=>{const[f,{isLoading:l}]=w(),{user:e,isLoading:b}=k(a=>a.auth),p=async()=>{var a;try{const o=await f({plan:s});if(o.error)throw new Error(o.error.message||"Failed to create checkout session");if((a=o.data)!=null&&a.checkoutUrl)window.location.href=o.data.checkoutUrl;else throw new Error("No checkout URL received")}catch(o){j.error(o.message||"Error creating checkout session"),console.error("Checkout error:",o)}},n=(a,o)=>{const d={free:1,starter:2,professional:3,believer:3,enterprise:4};return d[a]>d[o]};return r.jsxs("div",{onClick:u,className:`cursor-pointer md:max-w-80 w-full rounded-lg shadow-md p-6 flex flex-col ${g?"border-2 border-green":"border-2 border-black/30"}`,children:[r.jsx("h2",{className:"uppercase font-semibold text-xl mb-1",children:c}),r.jsx("p",{className:"text-sm font-medium mb-2",children:i}),r.jsx("div",{className:"h-0.5 my-2 w-full bg-grey-dark rounded-md"}),r.jsx("h3",{className:"text-2xl font-bold mt-3 mb-1",children:m}),r.jsx("p",{className:"text-sm font-medium mb-2",children:h}),r.jsx(v,{className:`py-2 px-8 mt-6 ${t||s===(e==null?void 0:e.plan)?"bg-green/20 text-green border-2 border-green hover:bg-green/30":""}`,variant:c==="free"?"secondary":"primary",onClickHandler:p,disabledBoolean:l||b||t||s===(e==null?void 0:e.plan)||n(e==null?void 0:e.plan,s),children:l?"Processing...":t||s===(e==null?void 0:e.plan)?"Current Plan":n(e==null?void 0:e.plan,s)?"Not Available":s==="free"?"Free":"Upgrade"}),r.jsx("div",{className:"h-0.5 my-6 w-full bg-grey-dark rounded-md"}),r.jsx("ul",{className:"flex-grow mt-2",children:x.map((a,o)=>r.jsxs("li",{className:"flex items-center mb-2",children:[r.jsx("svg",{className:"w-4 h-4 mr-2 text-green-500",fill:"currentColor",viewBox:"0 0 20 20",children:r.jsx("path",{fillRule:"evenodd",d:"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",clipRule:"evenodd"})}),a]},o))})]})};export{C as P};
