/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_auth_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next-auth/react */ \"./node_modules/next-auth/react/index.js\");\n/* harmony import */ var next_auth_react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_auth_react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nfunction App({ Component, pageProps: { session, ...pageProps } }) {\n    const [theme, setTheme] = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(\"light\");\n    // avoid reading localStorage during render to prevent hydration mismatch\n    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{\n        try {\n            const stored = localStorage.getItem(\"theme\");\n            if (stored && stored !== theme) setTheme(stored);\n        } catch (e) {}\n    // apply class when theme changes\n    }, []);\n    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{\n        try {\n            if (theme === \"dark\") document.documentElement.classList.add(\"dark\");\n            else document.documentElement.classList.remove(\"dark\");\n            localStorage.setItem(\"theme\", theme);\n        } catch (e) {}\n    }, [\n        theme\n    ]);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_auth_react__WEBPACK_IMPORTED_MODULE_2__.SessionProvider, {\n        session: session,\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"header\", {\n                    className: \"header\",\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"title\",\n                            children: \"Office Reservation\"\n                        }, void 0, false, {\n                            fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                            lineNumber: 29,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"nav\",\n                            children: [\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"a\", {\n                                    href: \"/admin\",\n                                    children: \"Admin\"\n                                }, void 0, false, {\n                                    fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                                    lineNumber: 31,\n                                    columnNumber: 13\n                                }, this),\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"a\", {\n                                    href: \"/map-editor\",\n                                    children: \"Map Editor\"\n                                }, void 0, false, {\n                                    fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                                    lineNumber: 32,\n                                    columnNumber: 13\n                                }, this),\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"a\", {\n                                    href: \"/admin/upload-svg\",\n                                    children: \"Upload\"\n                                }, void 0, false, {\n                                    fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                                    lineNumber: 33,\n                                    columnNumber: 13\n                                }, this),\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                    onClick: ()=>setTheme((t)=>t === \"dark\" ? \"light\" : \"dark\"),\n                                    style: {\n                                        marginLeft: 8\n                                    },\n                                    children: theme === \"dark\" ? \"Light Mode\" : \"Dark Mode\"\n                                }, void 0, false, {\n                                    fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                                    lineNumber: 34,\n                                    columnNumber: 13\n                                }, this)\n                            ]\n                        }, void 0, true, {\n                            fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                            lineNumber: 30,\n                            columnNumber: 11\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                    lineNumber: 28,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"main\", {\n                    className: \"container\",\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                        ...pageProps\n                    }, void 0, false, {\n                        fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                        lineNumber: 40,\n                        columnNumber: 11\n                    }, this)\n                }, void 0, false, {\n                    fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n                    lineNumber: 39,\n                    columnNumber: 9\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n            lineNumber: 27,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"D:\\\\projects\\\\office-reservation\\\\pages\\\\_app.tsx\",\n        lineNumber: 26,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQStCO0FBRW1CO0FBQ0M7QUFFcEMsU0FBU0ksSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFdBQVcsRUFBRUMsT0FBTyxFQUFFLEdBQUdELFdBQVcsRUFBWTtJQUN2RixNQUFNLENBQUNFLE9BQU9DLFNBQVMsR0FBR04sK0NBQVFBLENBQW1CO0lBQ3JELHlFQUF5RTtJQUN6RUQsZ0RBQVNBLENBQUM7UUFDUixJQUFJO1lBQ0YsTUFBTVEsU0FBU0MsYUFBYUMsT0FBTyxDQUFDO1lBQ3BDLElBQUlGLFVBQVVBLFdBQVdGLE9BQU9DLFNBQVNDO1FBQzNDLEVBQUUsT0FBT0csR0FBRyxDQUFDO0lBQ2IsaUNBQWlDO0lBQ25DLEdBQUcsRUFBRTtJQUVMWCxnREFBU0EsQ0FBQztRQUNSLElBQUk7WUFDRixJQUFJTSxVQUFVLFFBQVFNLFNBQVNDLGVBQWUsQ0FBQ0MsU0FBUyxDQUFDQyxHQUFHLENBQUM7aUJBQ3hESCxTQUFTQyxlQUFlLENBQUNDLFNBQVMsQ0FBQ0UsTUFBTSxDQUFDO1lBQy9DUCxhQUFhUSxPQUFPLENBQUMsU0FBU1g7UUFDaEMsRUFBRSxPQUFPSyxHQUFHLENBQUM7SUFDZixHQUFHO1FBQUNMO0tBQU07SUFFVixxQkFDRSw4REFBQ1IsNERBQWVBO1FBQUNPLFNBQVNBO2tCQUN4Qiw0RUFBQ2E7OzhCQUNDLDhEQUFDQztvQkFBT0MsV0FBVTs7c0NBQ2hCLDhEQUFDRjs0QkFBSUUsV0FBVTtzQ0FBUTs7Ozs7O3NDQUN2Qiw4REFBQ0Y7NEJBQUlFLFdBQVU7OzhDQUNiLDhEQUFDQztvQ0FBRUMsTUFBSzs4Q0FBUzs7Ozs7OzhDQUNqQiw4REFBQ0Q7b0NBQUVDLE1BQUs7OENBQWM7Ozs7Ozs4Q0FDdEIsOERBQUNEO29DQUFFQyxNQUFLOzhDQUFvQjs7Ozs7OzhDQUM1Qiw4REFBQ0M7b0NBQU9DLFNBQVMsSUFBTWpCLFNBQVMsQ0FBQ2tCLElBQU9BLE1BQU0sU0FBUyxVQUFVO29DQUFVQyxPQUFPO3dDQUFFQyxZQUFZO29DQUFFOzhDQUMvRnJCLFVBQVUsU0FBUyxlQUFlOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OEJBSXpDLDhEQUFDc0I7b0JBQUtSLFdBQVU7OEJBQ2QsNEVBQUNqQjt3QkFBVyxHQUFHQyxTQUFTOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS2xDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vb2ZmaWNlLXJlc2VydmF0aW9uLy4vcGFnZXMvX2FwcC50c3g/MmZiZSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uL3N0eWxlcy9nbG9iYWxzLmNzcyc7XHJcbmltcG9ydCB0eXBlIHsgQXBwUHJvcHMgfSBmcm9tICduZXh0L2FwcCc7XHJcbmltcG9ydCB7IFNlc3Npb25Qcm92aWRlciB9IGZyb20gJ25leHQtYXV0aC9yZWFjdCc7XHJcbmltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKHsgQ29tcG9uZW50LCBwYWdlUHJvcHM6IHsgc2Vzc2lvbiwgLi4ucGFnZVByb3BzIH0gfTogQXBwUHJvcHMpIHtcclxuICBjb25zdCBbdGhlbWUsIHNldFRoZW1lXSA9IHVzZVN0YXRlPCdsaWdodCcgfCAnZGFyayc+KCdsaWdodCcpO1xyXG4gIC8vIGF2b2lkIHJlYWRpbmcgbG9jYWxTdG9yYWdlIGR1cmluZyByZW5kZXIgdG8gcHJldmVudCBoeWRyYXRpb24gbWlzbWF0Y2hcclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3RoZW1lJykgYXMgJ2xpZ2h0JyB8ICdkYXJrJyB8IG51bGw7XHJcbiAgICAgIGlmIChzdG9yZWQgJiYgc3RvcmVkICE9PSB0aGVtZSkgc2V0VGhlbWUoc3RvcmVkKTtcclxuICAgIH0gY2F0Y2ggKGUpIHt9XHJcbiAgICAvLyBhcHBseSBjbGFzcyB3aGVuIHRoZW1lIGNoYW5nZXNcclxuICB9LCBbXSk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAodGhlbWUgPT09ICdkYXJrJykgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2RhcmsnKTtcclxuICAgICAgZWxzZSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnZGFyaycpO1xyXG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndGhlbWUnLCB0aGVtZSk7XHJcbiAgICB9IGNhdGNoIChlKSB7fVxyXG4gIH0sIFt0aGVtZV0pO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPFNlc3Npb25Qcm92aWRlciBzZXNzaW9uPXtzZXNzaW9ufT5cclxuICAgICAgPGRpdj5cclxuICAgICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cImhlYWRlclwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0aXRsZVwiPk9mZmljZSBSZXNlcnZhdGlvbjwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJuYXZcIj5cclxuICAgICAgICAgICAgPGEgaHJlZj1cIi9hZG1pblwiPkFkbWluPC9hPlxyXG4gICAgICAgICAgICA8YSBocmVmPVwiL21hcC1lZGl0b3JcIj5NYXAgRWRpdG9yPC9hPlxyXG4gICAgICAgICAgICA8YSBocmVmPVwiL2FkbWluL3VwbG9hZC1zdmdcIj5VcGxvYWQ8L2E+XHJcbiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0VGhlbWUoKHQpID0+ICh0ID09PSAnZGFyaycgPyAnbGlnaHQnIDogJ2RhcmsnKSl9IHN0eWxlPXt7IG1hcmdpbkxlZnQ6IDggfX0+XHJcbiAgICAgICAgICAgICAge3RoZW1lID09PSAnZGFyaycgPyAnTGlnaHQgTW9kZScgOiAnRGFyayBNb2RlJ31cclxuICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2hlYWRlcj5cclxuICAgICAgICA8bWFpbiBjbGFzc05hbWU9XCJjb250YWluZXJcIj5cclxuICAgICAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICAgICAgICA8L21haW4+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9TZXNzaW9uUHJvdmlkZXI+XHJcbiAgKTtcclxufVxyXG4iXSwibmFtZXMiOlsiU2Vzc2lvblByb3ZpZGVyIiwiUmVhY3QiLCJ1c2VFZmZlY3QiLCJ1c2VTdGF0ZSIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyIsInNlc3Npb24iLCJ0aGVtZSIsInNldFRoZW1lIiwic3RvcmVkIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImUiLCJkb2N1bWVudCIsImRvY3VtZW50RWxlbWVudCIsImNsYXNzTGlzdCIsImFkZCIsInJlbW92ZSIsInNldEl0ZW0iLCJkaXYiLCJoZWFkZXIiLCJjbGFzc05hbWUiLCJhIiwiaHJlZiIsImJ1dHRvbiIsIm9uQ2xpY2siLCJ0Iiwic3R5bGUiLCJtYXJnaW5MZWZ0IiwibWFpbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next-auth","vendor-chunks/@babel"], () => (__webpack_exec__("./pages/_app.tsx")));
module.exports = __webpack_exports__;

})();