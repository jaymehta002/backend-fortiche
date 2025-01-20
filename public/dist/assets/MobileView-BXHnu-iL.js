import{j as e,L as m}from"./main-DA-vLYwL.js";const r="/icons/tickUp.svg",j="/images/mobileFrame.png",p="/assets/bg-template-Cbh8o9wL.jpg",f=({linkItems:c,user:a={},tabid:s,products:n})=>{var o,i,d,t,x,g;return e.jsxs("div",{className:"flex flex-col items-center justify-center",children:[e.jsxs("div",{className:"relative flex justify-center items-center pt-4 pb-6",children:[e.jsx("div",{className:"absolute h-[610px] w-[300px] bg-no-repeat bg-center  bg-cover",style:{backgroundImage:`url(${j})`}}),e.jsxs("div",{className:`relative z-10 bg-${a.theme} h-[570px] w-[270px] rounded-[30px] shadow-lg overflow-x-scroll overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`,children:[e.jsx("div",{children:a.coverImage&&a.coverImage!==""?e.jsx("img",{src:a.coverImage,alt:"Background",className:"w-full h-[280px] object-cover"}):e.jsx("img",{src:p,alt:"Background",className:"w-full h-[280px] object-cover"})}),e.jsxs("div",{className:"px-4 -mt-[230px] pb-4",children:[e.jsx("div",{className:"relative",children:e.jsx("div",{className:"w-16 h-16 rounded-full border-4 border-green-500 overflow-hidden z-10",children:e.jsx("img",{src:a.avatar,alt:"Profile",className:"w-full h-full object-cover"})})}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("div",{className:"flex items-center",children:e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-semibold text-white",children:a==null?void 0:a.fullName}),e.jsx("p",{className:"text-gray-300",children:a==null?void 0:a.username})]})}),e.jsx("div",{className:"w-10 h-10 bg-white rounded-full flex justify-center items-center",children:e.jsx("div",{className:"text-black",children:"•••"})})]}),e.jsx("p",{className:"mt-4 text-sm text-gray-200",children:a==null?void 0:a.bio}),e.jsxs("div",{className:"flex justify-between mt-4",children:[((o=a==null?void 0:a.socials)==null?void 0:o.facebook)&&e.jsx("img",{src:"/images/facebook.png",alt:"Fb Icon",onClick:()=>{var l;return window.open((l=a==null?void 0:a.socials)==null?void 0:l.facebook,"_blank")},className:"h-8 w-8 rounded-full object-cover"}),((i=a==null?void 0:a.socials)==null?void 0:i.twitter)&&e.jsx("img",{src:"/images/x.png",alt:"X Icon",onClick:()=>{var l;return window.open((l=a==null?void 0:a.socials)==null?void 0:l.twitter,"_blank")},className:"h-8 w-8 rounded-full object-cover"}),((d=a==null?void 0:a.socials)==null?void 0:d.instagram)&&e.jsx("img",{src:"/images/insta.png",alt:"Insta Icon",onClick:()=>{var l;return window.open((l=a==null?void 0:a.socials)==null?void 0:l.instagram,"_blank")},className:"h-8 w-8 rounded-full object-cover"}),((t=a==null?void 0:a.socials)==null?void 0:t.youtube)&&e.jsx("img",{src:"/images/youtube.png",alt:"Icon",onClick:()=>{var l;return window.open((l=a==null?void 0:a.socials)==null?void 0:l.youtube,"_blank")},className:"h-8 w-8 rounded-full object-cover"}),((x=a==null?void 0:a.socials)==null?void 0:x.linkedin)&&e.jsx("img",{src:"/images/linkedin.png",alt:"Icon",onClick:()=>{var l;return window.open((l=a==null?void 0:a.socials)==null?void 0:l.linkedin,"_blank")},className:"h-8 w-8 rounded-full object-cover"}),((g=a==null?void 0:a.socials)==null?void 0:g.tiktok)&&e.jsx("img",{src:"/images/whatsapp.png",alt:"Icon",onClick:()=>{var l;return window.open((l=a==null?void 0:a.socials)==null?void 0:l.tiktok,"_blank")},className:"h-8 w-8 rounded-full object-cover"})]})]}),e.jsx("div",{className:"flex justify-center gap-4 py-[6px] px-1 mt-6 mb-5  bg-white rounded-full",children:["Links","Products"].map((l,h)=>e.jsx("button",{className:`py-[5px] px-[7px] text-sm rounded-3xl font-semibold ${l==s?"text-white bg-green-600":"text-gray-500 bg-[#f2fffc]"}`,children:l},h))}),s==="Links"&&e.jsx("div",{className:"px-4 py-2",children:c==null?void 0:c.map(l=>(l==null?void 0:l.isActive)&&e.jsxs("div",{className:"flex justify-between items-center bg-white shadow-md p-5 mb-3 rounded-lg",children:[e.jsxs("div",{className:"flex items-center",children:[e.jsx("img",{src:l.thumbnail,alt:l.host,className:"w-10 h-10 rounded-lg object-cover"}),e.jsx("div",{className:"ml-3 text-lg font-medium",children:l.host})]}),e.jsx(m,{to:l.url,target:"_blank",className:"w-9 h-9 rounded-full bg-[#f2fffc] flex justify-center items-center",children:e.jsx("img",{src:r,alt:"Tick Icon",className:"w-4"})})]},l.id))}),s==="Products"&&e.jsx("div",{className:"px-4 py-2",children:n==null?void 0:n.map(l=>e.jsxs("div",{className:"bg-white shadow-md p-5 mb-3 rounded-lg",children:[e.jsx("div",{className:"bg-purple-200 h-32 rounded-md overflow-hidden my-4",children:e.jsx("img",{src:l==null?void 0:l.imageUrls[0],alt:`${l==null?void 0:l.title}-image`,className:"w-full h-full object-cover"})}),e.jsx("div",{className:"flex flex-wrap gap-2 my-3",children:e.jsx("span",{className:"px-3 py-1 text-sm border rounded-lg",children:l==null?void 0:l.category})}),e.jsx("p",{className:"text-lg font-semibold mb-2 line-clamp-1",children:l==null?void 0:l.title}),e.jsxs("p",{className:"my-2 flex items-center gap-2",children:[e.jsxs("span",{className:"text-sm font-medium text-green-600",children:["$",l==null?void 0:l.pricing]}),e.jsxs("span",{className:"line-through text-sm text-gray-500",children:["$",l==null?void 0:l.wholesalaPricing]})]})]},l==null?void 0:l._id))})]})]}),e.jsx("div",{className:"pt-12",children:e.jsx(m,{to:"/links/customize-page",className:"px-6 py-2 bg-green-500 text-white-pure rounded-full hover:bg-green-600 transition duration-300",children:"Customize Page"})})]})};export{f as M,p as d};
