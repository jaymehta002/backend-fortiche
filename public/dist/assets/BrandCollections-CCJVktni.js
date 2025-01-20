import{w as y,r as d,as as v,a1 as _,ag as k,j as e}from"./main-DA-vLYwL.js";import{C as S}from"./Collections-CQRN6Gku.js";import{B as c}from"./Button-eyYpVHNH.js";import{B as j}from"./ReactToastify-DVzxAI-k.js";import{m as u}from"./motion-DxPbUJav.js";import{X as b}from"./x-B_3sECtp.js";import"./ShareToButton-CVeYcVAG.js";import"./createLucideIcon-yfTUF5RS.js";import"./trash-2-DU8ST79q.js";import"./chevron-right-D8akTFj8.js";import"./cn-DUyS5Z8L.js";const B=({isOpen:m,onClose:i})=>{var p,f;y(s=>s.auth);const[a,r]=d.useState(""),[l,n]=d.useState([]);d.useRef(null);const{data:o}=v(),{data:x,isLoading:N}=_(),[C]=k();if(x!=null&&x.data,!m)return null;const g=s=>{n(t=>t.some(h=>h._id===s._id)?t.filter(h=>h._id!==s._id):[...t,s])},w=async()=>{try{await C({title:a,productIds:l.map(s=>s._id)}).unwrap(),r(""),n([]),i(),j.success("Collection created successfully!")}catch(s){console.error("Failed to create collection:",s),j.error("Failed to create collection.")}};return e.jsx(u.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",children:e.jsxs(u.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},className:"bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col",children:[e.jsxs("div",{className:"flex justify-between items-center p-4 border-b",children:[e.jsx("h2",{className:"text-xl font-bold text-gray-800",children:"Create a Collection"}),e.jsx(c,{variant:"ghost",size:"icon",onClick:i,children:e.jsx(b,{className:"h-5 w-5"})})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Collection Title"}),e.jsx("input",{type:"text",placeholder:"Enter collection title",value:a,onChange:s=>r(s.target.value),className:"w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"})]}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-lg font-semibold mb-3",children:"Select Products"}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4",children:N?e.jsx("p",{children:"Loading products..."}):((p=o==null?void 0:o.products)==null?void 0:p.length)===0?e.jsx("p",{children:"No products available"}):(f=o==null?void 0:o.products)==null?void 0:f.map(s=>e.jsxs(u.div,{className:`relative rounded-lg overflow-hidden shadow-sm border cursor-pointer transition-all ${l.some(t=>t._id===s._id)?"ring-2 ring-blue-500":"hover:shadow-md"}`,whileHover:{scale:1.02},onClick:()=>g(s),children:[e.jsx("img",{src:(s==null?void 0:s.imageUrls[0])||"/api/placeholder/200/200",alt:s.title,className:"w-full aspect-square object-cover"}),e.jsxs("div",{className:"p-2 bg-white",children:[e.jsx("h4",{className:"font-medium text-sm truncate",children:s.title}),e.jsx("p",{className:"text-xs text-gray-500",children:l.some(t=>t._id===s._id)?"Selected":"Click to select"})]})]},s._id))})]}),e.jsxs("div",{children:[e.jsxs("h3",{className:"text-lg font-semibold mb-3",children:["Selected Products (",l.length,")"]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:l.map(s=>e.jsxs("div",{className:"flex items-center bg-gray-50 border rounded-full pl-1 pr-3 py-1",children:[e.jsx("img",{src:s.imageUrls[0]||"/api/placeholder/40/40",alt:s.title,className:"w-6 h-6 rounded-full mr-2 object-cover"}),e.jsx("span",{className:"text-sm truncate max-w-[120px]",children:s.title}),e.jsx(c,{variant:"ghost",size:"icon",className:"ml-1 text-gray-500 hover:text-gray-700 p-1",onClick:()=>g(s),children:e.jsx(b,{className:"h-3 w-3"})})]},s._id))})]})]}),e.jsxs("div",{className:"flex justify-end gap-3 p-4 border-t bg-gray-50",children:[e.jsx(c,{variant:"outline",onClick:i,children:"Cancel"}),e.jsxs(c,{className:"px-6 py-2 text-sm",onClick:w,disabled:!a||l.length===0,children:["Create Collection (",l.length," products)"]})]})]})})},L=()=>{y(n=>n.auth);const{data:m}=v(),[i,a]=d.useState(!1),r=()=>{a(!0)},l=()=>{a(!1)};return console.log(m,"brandProductsData"),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("h2",{className:"text-2xl font-bold mb-2",children:"Collections"}),e.jsx(c,{onClickHandler:r,variant:"secondary",className:"px-4 py-2 bg-blue-lighter border-grey-light",children:"+ Add Collection"})]}),e.jsx(S,{}),i&&e.jsx(B,{isOpen:i,onClose:l})]})};export{L as default};
