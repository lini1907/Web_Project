import React from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Shop } from "./pages/Shop";
import { Rescue } from "./pages/Rescue";
import { GroupBuy } from "./pages/GroupBuy";
import { Farm } from "./pages/Farm";
import { Cart } from "./pages/Cart";
import { ProductDetail } from "./pages/ProductDetail";
import { MysteryBox } from "./pages/MysteryBox";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "san-pham", Component: Shop },
      { path: "san-pham/:id", Component: ProductDetail },
      { path: "giai-cuu", Component: Rescue },
      { path: "mua-chung", Component: GroupBuy },
      { path: "nong-trai", Component: Farm },
      { path: "gio-hang", Component: Cart },
      { path: "hop-bi-an", Component: MysteryBox },
    ],
  },
]);