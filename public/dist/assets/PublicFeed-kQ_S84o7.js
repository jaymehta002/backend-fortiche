import{g as m,r as u,k as x,j as s,A as y}from"./main-DA-vLYwL.js";import{R as p}from"./index-BdrbOg9j.js";/* empty css                   */function v({children:o,isActive:t}){return t?s.jsx("div",{className:"py-6",children:o}):null}function b(){const{username:o}=m(),t=o.replace("@",""),[c,a]=u.useState(0),{data:n,isLoading:d}=x({username:t}),e=n==null?void 0:n.data,l=[{id:"privacyPolicy",title:"Privacy Policy",content:e!=null&&e.privacyPolicy?e==null?void 0:e.privacyPolicy:"No Privacy Policy Created."},{id:"termsAndConditions",title:"Terms & Conditions",content:e!=null&&e.termsAndConditions?e==null?void 0:e.termsAndConditions:"No Terms & Conditions Created."},{id:"refundPolicy",title:"Refund Policy",content:e!=null&&e.refundPolicy?e==null?void 0:e.refundPolicy:"No Refund Policy Created."}];return d?s.jsx(y,{}):s.jsx("div",{className:"container mx-auto px-4 py-8 max-w-4xl",children:s.jsxs("div",{className:"w-full bg-white rounded-lg shadow-sm",children:[s.jsx("div",{className:"flex border-b",children:l.map((r,i)=>s.jsx(s.Fragment,{children:e[r.id]&&s.jsx("button",{onClick:()=>a(i),className:`px-6 py-3 text-sm font-medium transition-colors duration-200
                                ${c===i?"border-b-2 border-green-500 text-green-700":"text-gray-500 hover:text-gray-700"}`,children:r.title},i)}))}),l.map((r,i)=>s.jsx(v,{isActive:c===i,children:s.jsx("div",{className:"px-6",children:s.jsx("div",{className:"flex flex-col gap-4",children:s.jsx(p,{readOnly:!0,theme:"snow",value:r.content,modules:{toolbar:!1}})})})},i))]})})}export{b as default};
