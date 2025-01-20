import{j as e,a0 as $,a1 as Q,r as o,w as U,U as z,V as O,T as V,L as q,_ as j,a as H,a2 as W,A as E,N as F,t as J}from"./main-DA-vLYwL.js";import{D as L}from"./Dropdown-CslC-zzG.js";import{S as _}from"./Searchbar-Dj_QCDtm.js";import{B as C}from"./Button-eyYpVHNH.js";import{S as K}from"./ShareToButton-CVeYcVAG.js";import{H as X,P as Y}from"./ProductCard-B9XCkjvZ.js";import{T as ee}from"./TemplateCard-ClP9v_IR.js";import{T as se}from"./Tab-CvsKf7OO.js";import"./cn-DUyS5Z8L.js";import"./createLucideIcon-yfTUF5RS.js";const B=({...s})=>e.jsx("svg",{...s,width:"22",height:"19",viewBox:"0 0 22 19",fill:"white",xmlns:"http://www.w3.org/2000/svg",children:e.jsx("path",{d:"M15.6875 0.75C13.7516 0.75 12.0566 1.5825 11 2.98969C9.94344 1.5825 8.24844 0.75 6.3125 0.75C4.77146 0.751737 3.29404 1.36468 2.20436 2.45436C1.11468 3.54404 0.501737 5.02146 0.5 6.5625C0.5 13.125 10.2303 18.4369 10.6447 18.6562C10.7539 18.715 10.876 18.7458 11 18.7458C11.124 18.7458 11.2461 18.715 11.3553 18.6562C11.7697 18.4369 21.5 13.125 21.5 6.5625C21.4983 5.02146 20.8853 3.54404 19.7956 2.45436C18.706 1.36468 17.2285 0.751737 15.6875 0.75ZM11 17.1375C9.28813 16.14 2 11.5959 2 6.5625C2.00149 5.41921 2.45632 4.32317 3.26475 3.51475C4.07317 2.70632 5.16921 2.25149 6.3125 2.25C8.13594 2.25 9.66687 3.22125 10.3062 4.78125C10.3628 4.91881 10.4589 5.03646 10.5824 5.11926C10.7059 5.20207 10.8513 5.24627 11 5.24627C11.1487 5.24627 11.2941 5.20207 11.4176 5.11926C11.5411 5.03646 11.6372 4.91881 11.6937 4.78125C12.3331 3.21844 13.8641 2.25 15.6875 2.25C16.8308 2.25149 17.9268 2.70632 18.7353 3.51475C19.5437 4.32317 19.9985 5.41921 20 6.5625C20 11.5884 12.71 16.1391 11 17.1375Z"})}),te=({product:s})=>{var S;const[l]=$(),{data:i,isLoading:c}=Q(),[r,d]=o.useState(!1),u=U(n=>n.auth.user),[m]=z(),[f]=O(),{data:h,isLoading:w}=V(),[t,v]=o.useState(!1),{_id:A,id:b,imageUrls:a,title:g,category:P,brand:k,description:le,pricing:y,wholesalePricing:T}=s,N=A||b,M=Array.isArray(P)?P:[P],R=y?((y-T)/y*100).toFixed(2):null;if(o.useEffect(()=>{if(!c&&i){const x=(i.data||[]).some(p=>{var I;return((I=p==null?void 0:p.productId)==null?void 0:I._id)===N});d(x)}},[i,c,N]),o.useEffect(()=>{if(!w&&h){const x=(h.data||[]).some(p=>p._id===N);v(x)}},[h,w,N]),!s||r)return null;const D=(S=i==null?void 0:i.data)==null?void 0:S.length,G=async()=>{if(!u.stripeAccountId){j.error("Please connect your Stripe account to recommend products. Go to Settings > Billing.");return}if(u.plan==="free"&&D>=5){j.error("Free plan users can only create up to 5 affiliations");return}try{await l({productId:N}).unwrap(),j.success("Affiliation created successfully!"),d(!0)}catch(n){j.error("Error creating affiliation."),console.error("Failed to create affiliation:",n)}},Z=async n=>{n.stopPropagation(),n.preventDefault(),v(x=>!x);try{t?(await f(s._id).unwrap(),j.error("Removed from wishlist!")):(await m(s._id).unwrap(),j.success("Added to wishlist!"))}catch{v(p=>!p),j.error(t?"Error removing from wishlist.":"Error adding to wishlist.")}};return e.jsxs("div",{className:"p-4 bg-green-light rounded-xl",children:[e.jsxs("div",{className:"relative h-40 sm:h-48 md:h-56 w-full rounded-2xl overflow-hidden bg-grey-light",children:[e.jsx(C,{variant:"secondary",className:`absolute right-2 top-2 p-2.5 ${t?"bg-primary":"bg-white-pure"} border-none`,onClickHandler:Z,children:e.jsx(X,{className:t?"fill-red-500 text-red-600":"fill-white-pure"})}),e.jsx("img",{src:a[0],alt:g,className:"w-full h-full object-cover"})]}),e.jsxs("div",{className:"flex flex-wrap justify-between items-center gap-2 my-3",children:[M.map((n,x)=>e.jsx("span",{className:"px-3 py-1 text-sm bg-white-pure rounded-lg",children:n},x)),e.jsx(K,{url:`${window.location.origin}/explore/product/${s._id}`,title:s.title})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-lg font-semibold truncate hover:text-clip hover:whitespace-normal",children:g}),e.jsx(q,{to:"/brand-details",className:"font-medium",children:k}),e.jsxs("p",{className:"my-2 flex items-center gap-2",children:[e.jsxs("span",{className:"text-xl font-semibold",children:["$",T]}),y&&e.jsxs(e.Fragment,{children:[e.jsxs("span",{className:"line-through text-sm",children:["$",y]}),e.jsx("span",{className:"text-sm text-green",children:`(-${R}%)`})]})]}),e.jsx("div",{className:"mt-8 flex justify-between",children:r?e.jsx(C,{variant:"secondary",className:"px-6 w-full py-2",disabledBoolean:!0,children:"Recommended"}):e.jsx(C,{onClickHandler:G,variant:"primary",className:"px-6 w-full py-2",children:"Recommend"})})]})]})},ie=()=>{var w;const[s,l]=o.useState(""),[i,c]=o.useState("Category"),r=H(),{data:d,isLoading:u}=W({limit:100,page:1});if(u)return e.jsx(E,{});const m=((w=d==null?void 0:d.data)==null?void 0:w.products.filter(t=>t.isRecommended==!0?t:null))||[],f=m==null?void 0:m.filter(t=>t.title.toLowerCase().includes(s.toLowerCase())&&(i==="Category"||t.category===i)),h=()=>{r("/wishlist")};return e.jsxs("div",{children:[e.jsxs("div",{className:"flex md:flex-row flex-col justify-between gap-4 md:gap-0 md:my-8 my-4",children:[e.jsx(_,{searchText:s,setSearchText:l,className:"w-full rounded-3xl"}),e.jsxs("div",{className:"w-full flex items-center justify-end gap-4 text-right",children:[e.jsx(C,{variant:"primary",onClickHandler:h,className:"p-2.5",children:e.jsx(B,{})}),e.jsx(L,{options:F,name:i,onChange:t=>c(t)})]})]}),u?e.jsx("p",{className:"text-center",children:"Loading..."}):f.length===0?e.jsx("div",{className:"h-[50vh] grid place-items-center",children:e.jsx("p",{className:"text-center text-3xl font-bold capitalize",children:"No brands found"})}):e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",children:[...f].reverse().map(t=>e.jsx(te,{product:t},t._id))})]})},ae=()=>{var b;const[s,l]=o.useState(""),[i,c]=o.useState("Category"),[r,d]=o.useState("Filter"),u=H(),{data:m,isLoading:f}=W({limit:100,page:1});if(f)return e.jsx(E,{});const h=((b=m==null?void 0:m.data)==null?void 0:b.products)||[],t=[...h==null?void 0:h.filter(a=>a.title.toLowerCase().includes(s.toLowerCase())&&(i==="Category"||a.category===i))].sort((a,g)=>r==="A to Z"?a.title.localeCompare(g.title):r==="Z to A"?g.title.localeCompare(a.title):r==="Price: Low to High"?a.wholesalePricing-g.wholesalePricing:r==="Price: High to Low"?g.wholesalePricing-a.wholesalePricing:0),v=()=>{u("/wishlist")},A=()=>{l(""),c("Category"),d("Filter")};return e.jsxs("div",{className:" mx-auto px-4",children:[e.jsxs("div",{className:"flex flex-col md:flex-row justify-between my-8 gap-4",children:[e.jsx(_,{searchText:s,setSearchText:l,className:"w-full md:w-1/3 rounded-3xl"}),e.jsxs("div",{className:"flex gap-5 justify-end",children:[e.jsx(C,{variant:"primary",onClickHandler:v,className:"p-2.5",children:e.jsx(B,{})}),e.jsx(L,{options:F,name:i,onChange:a=>c(a)}),e.jsx(L,{options:["Filter","A to Z","Z to A","Price: Low to High","Price: High to Low"],name:r,onChange:a=>d(a)})]}),e.jsx(C,{onClickHandler:A,className:"bg-gray-200 p-2.5 text-red",children:"Clear"})]}),f?e.jsx("p",{className:"text-center",children:"Loading..."}):t.length===0?e.jsx("div",{className:"h-[50vh] grid place-items-center",children:e.jsx("p",{className:"text-center text-3xl font-bold capitalize",children:"No products found"})}):e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",children:[...t].reverse().map(a=>e.jsx(Y,{product:a},a._id))})]})},re={0:{id:"products",name:"B2B Market"},1:{id:"brands",name:"Earn Money"},2:{id:"templates",name:"Templates"}},pe=()=>{const s=J(),[l,i]=o.useState(0);o.useEffect(()=>{var r;((r=s.state)==null?void 0:r.activeTab)!==void 0&&i(s.state.activeTab)},[s.state]);const c=r=>{i(r)};return e.jsx("div",{className:"flex flex-col gap-4",children:e.jsxs("div",{className:"my-4",children:[e.jsx("div",{className:"mb-4 max-w-96",children:e.jsx(se,{tabsData:Object.values(re),activeTabIndex:l,handleTabChange:c})}),e.jsxs("div",{children:[l===0&&e.jsx(ae,{}),l===1&&e.jsx(ie,{}),l===2&&e.jsx(ee,{})]})]})})};export{pe as default};
