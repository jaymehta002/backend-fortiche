import{r as l,a8 as y,a as L,j as e,A,_ as r}from"./main-DA-vLYwL.js";import{A as C}from"./AddUrlModal-BpAiW84G.js";import"./Button-eyYpVHNH.js";import"./cn-DUyS5Z8L.js";import"./Modal-DmDqMwFG.js";const F=({title:h})=>{const[o,d]=l.useState(""),[i,u]=l.useState(""),[a,n]=l.useState(null),m=l.useRef(null),[x,{isLoading:p}]=y(),f=L(),[b,c]=l.useState(!1),g=async s=>{try{if(!s.host||!s.url||!s.thumbnail){r.error("Please fill all the fields");return}const t=new FormData;t.append("host",s.host),t.append("url",s.url),s.thumbnail instanceof File&&t.append("thumbnail",s.thumbnail),s._id?await x({id:s._id,data:t}).unwrap():await x(t).unwrap(),r.success(s._id?"Link updated successfully":"Link added successfully"),f("/explore",{state:{activeTab:2}})}catch(t){console.error("Error saving link:",t),r.error("Error saving link")}},j=s=>{s.preventDefault(),o&&i&&a?c(!0):r.error("Please fill all the fields")},v=s=>{s&&(g({host:o,url:i,thumbnail:a}),d(""),u(""),n(null)),c(!1)},N=s=>{const t=s.target.files[0];n(t||null)},w=()=>{n(null),m.current.value=""};return p?e.jsx(A,{}):e.jsxs(e.Fragment,{children:[b&&e.jsx(C,{handleConfirmationModal:v,onClose:()=>c(!1)}),e.jsxs("form",{onSubmit:j,className:"p-6 rounded-lg max-w-2xl",children:[e.jsxs("div",{className:"flex flex-row space-x-4 items-center",children:[e.jsx("button",{onClick:()=>f("/explore",{state:{activeTab:2}}),className:"mb-4 ",children:e.jsx("img",{src:"/icons/back_button.svg",alt:"back"})}),e.jsx("h2",{className:"text-2xl font-bold text-center mb-4",children:h})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{htmlFor:"title",className:"block text-base ",children:"Title"}),e.jsx("input",{type:"text",id:"title",placeholder:"Link Title",value:o,className:"mt-1 block w-full px-3 py-2 bg-white-pure  rounded-2xl shadow-sm  focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm",onChange:s=>d(s.target.value)})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{htmlFor:"url",className:"block text-base ",children:"URL"}),e.jsx("input",{type:"text",id:"url",placeholder:"Add your URL here",value:i,className:"mt-1 block w-full px-3 py-2 bg-white-pure rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm",onChange:s=>u(s.target.value)})]}),e.jsxs("div",{className:"mb-4 flex flex-col ",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"mr-4",children:"Thumbnail"}),a?e.jsx("button",{type:"button",className:"text-green text-base font-semibold underline",onClick:w,children:"- REMOVE"}):e.jsx("label",{htmlFor:"productImage",className:"text-green text-base font-semibold underline cursor-pointer",children:"+ UPLOAD"})]}),e.jsxs("div",{className:"flex my-2",children:[a&&e.jsx("img",{src:URL.createObjectURL(a),alt:"product image",className:"w-32 h-32 object-cover rounded-lg"}),e.jsx("input",{type:"file",name:"productImage",className:"hidden",id:"productImage",onChange:N,ref:m})]})]}),e.jsx("button",{type:"submit",className:"w-44 py-2 px-4 bg-green-500 text-white-pure font-semibold rounded-3xl shadow hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",children:"Add"})]})]})};export{F as default};
