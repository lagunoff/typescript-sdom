export default `
@charset "UTF-8";
/*!
 * awsm.css v3.0.0 (https://igoradamenko.github.io/awsm.css/)
 * Copyright 2015 Igor Adamenko
 * Licensed under MIT (https://github.com/igoradamenko/awsm.css/blob/master/LICENSE.md)
 */
html{
  font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "PT Sans", "Open Sans", "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size:100%;
  line-height:1.4;
  background:white;
  color:black;
  -webkit-overflow-scrolling:touch;
}

body{
  margin:1.2em;
  font-size:1rem;
}
@media (min-width: 20rem){
  body{
    font-size:calc(1rem + 0.00625 * (100vw - 20rem));
  }
}
@media (min-width: 40rem){
  body{
    font-size:1.125rem;
  }
}
body header,
body main,
body footer,
body article{
  position:relative;
  max-width:40rem;
  margin:0 auto;
}
body > header{
  margin-bottom:3.5em;
}
body > header h1{
  margin:0;
  font-size:1.5em;
}
body > header p{
  margin:0;
  font-size:0.85em;
}
body > footer{
  margin-top:4.5em;
  padding-bottom:1.5em;
  text-align:center;
  font-size:0.8rem;
  color:#aaaaaa;
}

nav{
  margin:1em 0;
}
nav ul{
  list-style:none;
  margin:0;
  padding:0;
}
nav li{
  display:inline-block;
  margin-right:1em;
  margin-bottom:0.25em;
}
nav a:visited{
  color:#0064c1;
}
nav a:hover{
  color:#f00000;
}

ul, ol{
  margin-top:0;
  padding-top:0;
  padding-left:2.5em;
}
ul li + li, ol li + li{
  margin-top:0.25em;
}

p{
  margin:1em 0;
  -webkit-hyphens:auto;
      -ms-hyphens:auto;
          hyphens:auto;
}
p:first-child{
  margin-top:0;
}
p:last-child{
  margin-bottom:0;
}
p + ul, p + ol{
  margin-top:-0.75em;
}
p img, p picture{
  float:right;
  margin-bottom:0.5em;
  margin-left:0.5em;
}
p picture img{
  float:none;
  margin:0;
}

dd{
  margin-bottom:1em;
  margin-left:0;
  padding-left:2.5em;
}

dt{
  font-weight:700;
}

blockquote{
  margin:0;
  padding-left:2.5em;
}

aside{
  margin:0.5em 0;
  font-style:italic;
  color:#aaaaaa;
}
@media (min-width: 65rem){
  aside{
    position:absolute;
    right:-12.5rem;
    width:9.375rem;
    max-width:9.375rem;
    margin:0;
    padding-left:0.5em;
    font-size:0.8em;
    border-left:1px solid #f2f2f2;
  }
}
aside:first-child{
  margin-top:0;
}
aside:last-child{
  margin-bottom:0;
}

section + section{
  margin-top:2em;
}

h1, h2, h3, h4, h5, h6{
  margin:1.25em 0 0;
  line-height:1.2;
}
h1:hover > a[href^="#"][id]:empty, h1:focus > a[href^="#"][id]:empty, h2:hover > a[href^="#"][id]:empty, h2:focus > a[href^="#"][id]:empty, h3:hover > a[href^="#"][id]:empty, h3:focus > a[href^="#"][id]:empty, h4:hover > a[href^="#"][id]:empty, h4:focus > a[href^="#"][id]:empty, h5:hover > a[href^="#"][id]:empty, h5:focus > a[href^="#"][id]:empty, h6:hover > a[href^="#"][id]:empty, h6:focus > a[href^="#"][id]:empty{
  opacity:1;
}
h1 + p, h1 + details, h2 + p, h2 + details, h3 + p, h3 + details, h4 + p, h4 + details, h5 + p, h5 + details, h6 + p, h6 + details{
  margin-top:0.5em;
}
h1 > a[href^="#"][id]:empty, h2 > a[href^="#"][id]:empty, h3 > a[href^="#"][id]:empty, h4 > a[href^="#"][id]:empty, h5 > a[href^="#"][id]:empty, h6 > a[href^="#"][id]:empty{
  position:absolute;
  left:-0.65em;
  opacity:0;
  text-decoration:none;
  font-weight:400;
  line-height:1;
  color:#aaaaaa;
}
@media (min-width: 40rem){
  h1 > a[href^="#"][id]:empty, h2 > a[href^="#"][id]:empty, h3 > a[href^="#"][id]:empty, h4 > a[href^="#"][id]:empty, h5 > a[href^="#"][id]:empty, h6 > a[href^="#"][id]:empty{
    left:-0.8em;
  }
}
h1 > a[href^="#"][id]:empty:target, h1 > a[href^="#"][id]:empty:hover, h1 > a[href^="#"][id]:empty:focus, h2 > a[href^="#"][id]:empty:target, h2 > a[href^="#"][id]:empty:hover, h2 > a[href^="#"][id]:empty:focus, h3 > a[href^="#"][id]:empty:target, h3 > a[href^="#"][id]:empty:hover, h3 > a[href^="#"][id]:empty:focus, h4 > a[href^="#"][id]:empty:target, h4 > a[href^="#"][id]:empty:hover, h4 > a[href^="#"][id]:empty:focus, h5 > a[href^="#"][id]:empty:target, h5 > a[href^="#"][id]:empty:hover, h5 > a[href^="#"][id]:empty:focus, h6 > a[href^="#"][id]:empty:target, h6 > a[href^="#"][id]:empty:hover, h6 > a[href^="#"][id]:empty:focus{
  opacity:1;
  box-shadow:none;
  color:black;
}
h1 > a[href^="#"][id]:empty:target:focus, h2 > a[href^="#"][id]:empty:target:focus, h3 > a[href^="#"][id]:empty:target:focus, h4 > a[href^="#"][id]:empty:target:focus, h5 > a[href^="#"][id]:empty:target:focus, h6 > a[href^="#"][id]:empty:target:focus{
  outline:none;
}
h1 > a[href^="#"][id]:empty::before, h2 > a[href^="#"][id]:empty::before, h3 > a[href^="#"][id]:empty::before, h4 > a[href^="#"][id]:empty::before, h5 > a[href^="#"][id]:empty::before, h6 > a[href^="#"][id]:empty::before{
  content:"§ ";
}

h1{
  font-size:2.5em;
}

h2{
  font-size:1.75em;
}

h3{
  font-size:1.25em;
}

h4{
  font-size:1.15em;
}

h5{
  font-size:1em;
}

h6{
  margin-top:1em;
  font-size:1em;
  color:#aaaaaa;
}

article + article{
  margin-top:5em;
}
article header p{
  font-size:0.6em;
  color:#aaaaaa;
}
article header p + h1, article header p + h2{
  margin-top:-0.25em;
}
article header h1 + p, article header h2 + p{
  margin-top:0.25em;
}
article header h1 a, article header h2 a{
  color:black;
}
article header h1 a:visited, article header h2 a:visited{
  color:#aaaaaa;
}
article header h1 a:visited:hover, article header h2 a:visited:hover{
  color:#f00000;
}
article > footer{
  margin-top:1.5em;
  font-size:0.85em;
}

a{
  color:#0064c1;
}
a:visited{
  color:#8d39d0;
}
a:hover, a:active{
  outline-width:0;
}
a:hover{
  color:#f00000;
}
a abbr{
  font-size:1em;
}

abbr{
  margin-right:-0.075em;
  text-decoration:none;
  -webkit-hyphens:none;
      -ms-hyphens:none;
          hyphens:none;
  letter-spacing:0.075em;
  font-size:0.9em;
}

img, picture{
  display:block;
  max-width:100%;
  margin:0 auto;
}

audio, video{
  width:100%;
  max-width:100%;
}

figure{
  margin:1em 0 0.5em;
  padding:0;
}
figure + p{
  margin-top:0.5em;
}
figure figcaption{
  opacity:0.65;
  font-size:0.85em;
}

table{
  display:inline-block;
  border-spacing:0;
  border-collapse:collapse;
  overflow-x:auto;
  max-width:100%;
  text-align:left;
  vertical-align:top;
  background:linear-gradient(rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%) 0 0, linear-gradient(rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%) 100% 0;
  background-attachment:scroll, scroll;
  background-size:1px 100%, 1px 100%;
  background-repeat:no-repeat, no-repeat;
}
table caption{
  font-size:0.9em;
  background:white;
}
table td, table th{
  padding:0.35em 0.75em;
  vertical-align:top;
  font-size:0.9em;
  border:1px solid #f2f2f2;
  border-top:0;
  border-left:0;
}
table td:first-child, table th:first-child{
  padding-left:0;
  background-image:linear-gradient(to right, white 50%, rgba(255, 255, 255, 0) 100%);
  background-size:2px 100%;
  background-repeat:no-repeat;
}
table td:last-child, table th:last-child{
  padding-right:0;
  border-right:0;
  background-image:linear-gradient(to left, white 50%, rgba(255, 255, 255, 0) 100%);
  background-position:100% 0;
  background-size:2px 100%;
  background-repeat:no-repeat;
}
table td:only-child, table th:only-child{
  background-image:linear-gradient(to right, white 50%, rgba(255, 255, 255, 0) 100%), linear-gradient(to left, white 50%, rgba(255, 255, 255, 0) 100%);
  background-position:0 0, 100% 0;
  background-size:2px 100%, 2px 100%;
  background-repeat:no-repeat, no-repeat;
}
table th{
  line-height:1.2;
}

form{
  margin-right:auto;
  margin-left:auto;
}
@media (min-width: 40rem){
  form{
    max-width:80%;
  }
}
form select, form label{
  display:block;
}
form label:not(:first-child){
  margin-top:1em;
}
form p label{
  display:inline;
}
form p label + label{
  margin-left:1em;
}
form legend:first-child + label{
  margin-top:0;
}
form select, form input[type], form textarea{
  margin-bottom:1em;
}
form input[type=checkbox], form input[type=radio]{
  margin-bottom:0;
}

fieldset{
  margin:0;
  padding:0.5em 1em;
  border:1px solid #aaaaaa;
}

legend{
  color:#aaaaaa;
}

button{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:inline-block;
  width:auto;
  background:#f2f2f2;
  color:black;
  cursor:pointer;
}
button:focus{
  border:1px solid black;
}
button:hover{
  border:1px solid black;
}
button:active{
  background-color:#aaaaaa;
}

select{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:inline-block;
  width:auto;
  background:#f2f2f2;
  color:black;
  cursor:pointer;
  padding-right:1.2em;
  background-position:top 55% right 0.35em;
  background-size:0.5em;
  background-repeat:no-repeat;
  -webkit-appearance:button;
     -moz-appearance:button;
          appearance:button;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'%3E%3Cpath fill='rgb(170, 170, 170)' fill-rule='nonzero' d='M1.5 2L3 0H0z'/%3E%3C/svg%3E");
}
select:focus{
  border:1px solid black;
}
select:hover{
  border:1px solid black;
}
select:active{
  background-color:#aaaaaa;
}
select:focus, select:hover{
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'%3E%3Cpath fill='rgb(0, 0, 0)' fill-rule='nonzero' d='M1.5 2L3 0H0z'/%3E%3C/svg%3E");
}

input[type=text], input[type=password], input[type^=date], input[type=email], input[type=number], input[type=search], input[type=tel], input[type=time], input[type=month], input[type=week], input[type=url]{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:block;
  width:100%;
  line-height:calc(2em - 1px * 2 - (.25em - 1px) * 2);
  -webkit-appearance:none;
     -moz-appearance:none;
          appearance:none;
}
input[type=text]:focus, input[type=password]:focus, input[type^=date]:focus, input[type=email]:focus, input[type=number]:focus, input[type=search]:focus, input[type=tel]:focus, input[type=time]:focus, input[type=month]:focus, input[type=week]:focus, input[type=url]:focus{
  border:1px solid black;
}
input[type=text]::-moz-placeholder, input[type=password]::-moz-placeholder, input[type^=date]::-moz-placeholder, input[type=email]::-moz-placeholder, input[type=number]::-moz-placeholder, input[type=search]::-moz-placeholder, input[type=tel]::-moz-placeholder, input[type=time]::-moz-placeholder, input[type=month]::-moz-placeholder, input[type=week]::-moz-placeholder, input[type=url]::-moz-placeholder{
  color:#aaaaaa;
}
input[type=text]::-webkit-input-placeholder, input[type=password]::-webkit-input-placeholder, input[type^=date]::-webkit-input-placeholder, input[type=email]::-webkit-input-placeholder, input[type=number]::-webkit-input-placeholder, input[type=search]::-webkit-input-placeholder, input[type=tel]::-webkit-input-placeholder, input[type=time]::-webkit-input-placeholder, input[type=month]::-webkit-input-placeholder, input[type=week]::-webkit-input-placeholder, input[type=url]::-webkit-input-placeholder{
  color:#aaaaaa;
}
input[type=text]:-ms-input-placeholder, input[type=password]:-ms-input-placeholder, input[type^=date]:-ms-input-placeholder, input[type=email]:-ms-input-placeholder, input[type=number]:-ms-input-placeholder, input[type=search]:-ms-input-placeholder, input[type=tel]:-ms-input-placeholder, input[type=time]:-ms-input-placeholder, input[type=month]:-ms-input-placeholder, input[type=week]:-ms-input-placeholder, input[type=url]:-ms-input-placeholder{
  color:#aaaaaa;
}
input[type=submit], input[type=button], input[type=reset]{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:inline-block;
  width:auto;
  background:#f2f2f2;
  color:black;
  cursor:pointer;
  -webkit-appearance:none;
     -moz-appearance:none;
          appearance:none;
}
input[type=submit]:focus, input[type=button]:focus, input[type=reset]:focus{
  border:1px solid black;
}
input[type=submit]:hover, input[type=button]:hover, input[type=reset]:hover{
  border:1px solid black;
}
input[type=submit]:active, input[type=button]:active, input[type=reset]:active{
  background-color:#aaaaaa;
}
input[type=color]{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:block;
  width:100%;
  line-height:calc(2em - 1px * 2 - (.25em - 1px) * 2);
  -webkit-appearance:none;
     -moz-appearance:none;
          appearance:none;
  width:6em;
}
input[type=color]:focus{
  border:1px solid black;
}
input[type=color]::-moz-placeholder{
  color:#aaaaaa;
}
input[type=color]::-webkit-input-placeholder{
  color:#aaaaaa;
}
input[type=color]:-ms-input-placeholder{
  color:#aaaaaa;
}
input[type=color]:hover{
  border:1px solid black;
}
input[type=file]{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:inline-block;
  width:auto;
  background:#f2f2f2;
  color:black;
  cursor:pointer;
  display:block;
  width:100%;
  height:auto;
  padding:0.75em 0.5em;
  font-size:12px;
  line-height:1;
}
input[type=file]:focus{
  border:1px solid black;
}
input[type=file]:hover{
  border:1px solid black;
}
input[type=file]:active{
  background-color:#aaaaaa;
}
input[type=checkbox], input[type=radio]{
  margin:-0.2em 0.75em 0 0;
  vertical-align:middle;
}

textarea{
  outline:none;
  box-sizing:border-box;
  height:2em;
  margin:0;
  padding:calc(.25em - 1px) 0.5em;
  font-family:inherit;
  font-size:1em;
  border:1px solid #aaaaaa;
  border-radius:2px;
  background:white;
  color:black;
  display:block;
  width:100%;
  line-height:calc(2em - 1px * 2 - (.25em - 1px) * 2);
  -webkit-appearance:none;
     -moz-appearance:none;
          appearance:none;
  height:4.5em;
  resize:vertical;
  padding-top:0.5em;
  padding-bottom:0.5em;
}
textarea:focus{
  border:1px solid black;
}
textarea::-moz-placeholder{
  color:#aaaaaa;
}
textarea::-webkit-input-placeholder{
  color:#aaaaaa;
}
textarea:-ms-input-placeholder{
  color:#aaaaaa;
}

output{
  display:block;
}

code, kbd, var, samp{
  font-family:Consolas, "Lucida Console", Monaco, monospace;
  font-style:normal;
}

pre{
  overflow-x:auto;
  font-size:0.8em;
  background:linear-gradient(rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%) 0 0, linear-gradient(rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%) 100% 0;
  background-attachment:scroll, scroll;
  background-size:1px 100%, 1px 100%;
  background-repeat:no-repeat, no-repeat;
}
pre > code{
  display:inline-block;
  overflow-x:visible;
  box-sizing:border-box;
  min-width:100%;
  border-right:3px solid white;
  border-left:1px solid white;
}

hr{
  height:1px;
  margin:2em 0;
  border:0;
  background:#f2f2f2;
}

details{
  margin:1em 0;
}
details[open]{
  padding-bottom:0.5em;
  border-bottom:1px solid #f2f2f2;
}

summary{
  display:inline-block;
  font-weight:700;
  border-bottom:1px dashed;
  cursor:pointer;
}
summary::-webkit-details-marker{
  display:none;
}

noscript{
  color:#d00000;
}

::selection{
  background:rgba(0, 100, 193, 0.25);
}`;
