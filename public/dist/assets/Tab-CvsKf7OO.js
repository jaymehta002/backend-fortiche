import{j as e}from"./main-DA-vLYwL.js";const c=({tabsData:s=[],activeTabIndex:r,handleTabChange:a})=>e.jsx("div",{className:"w-full",children:e.jsx("ul",{className:"flex gap-2 flex-nowrap justify-between overflow-auto text-center text-sm font-medium scrollbar-hide md:text-base bg-white-pure rounded-full p-2",children:s.map((t,l)=>e.jsx("li",{className:"grow-[1]","aria-label":"Tabs",children:e.jsx("button",{className:`group inline-flex items-center justify-center whitespace-nowrap md:p-1 p-2 rounded-2xl w-full ${r==l?"bg-green text-white-pure":"bg-blue-lighter"}`,onClick:i=>{i.preventDefault(),a(l)},children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:r==l?"text-white-pure ":"text-gray-600",children:t.icon}),t.name]})})},t.id))})});export{c as T};
