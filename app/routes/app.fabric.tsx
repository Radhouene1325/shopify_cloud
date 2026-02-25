import { useEffect, useRef } from "react";
import { fabric } from "fabric";

export default function Gioca() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  useEffect(() => {
    const canvas = new fabric.Canvas("outfit-canvas", {
      width: 400,
      height: 600,
    });

    fabricRef.current = canvas;

    // Load base model
    fabric.Image.fromURL("/images/model.png", (img) => {
      img.selectable = false;
      canvas.add(img);
      canvas.sendToBack(img);
    });

    return () => canvas.dispose();
  }, []);

  const addClothing = (url) => {
    fabric.Image.fromURL(url, (img) => {
      img.set({
        left: 100,
        top: 150,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      fabricRef.current.add(img);
    });
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div>
        <canvas id="outfit-canvas" ref={canvasRef}></canvas>
      </div>

      <div>
        <h3>Seleziona Outfit</h3>

        <button onClick={() => addClothing("/images/giacca.png")}>
          Giacca
        </button>

        <button onClick={() => addClothing("/images/pantalone.png")}>
          Pantalone
        </button>

        <button onClick={() => addClothing("/images/scarpe.png")}>
          Scarpe
        </button>
      </div>
    </div>
  );
}











export const fakeProducts = [
    {
      id: "j1",
      title: "Giacca Elegante Nera",
      category: "jacket",
      price: 149,
      image: "/images/giacca-nera.png",
    },
    {
      id: "j2",
      title: "Giacca Casual Beige",
      category: "jacket",
      price: 129,
      image: "/images/giacca-beige.png",
    },
    {
      id: "p1",
      title: "Pantalone Slim Nero",
      category: "pants",
      price: 89,
      image: "/images/pantalone-nero.png",
    },
    {
      id: "p2",
      title: "Pantalone Classico Grigio",
      category: "pants",
      price: 99,
      image: "/images/pantalone-grigio.png",
    },
    {
      id: "s1",
      title: "Scarpe Eleganti Nere",
      category: "shoes",
      price: 179,
      image: "/images/scarpe-nere.png",
    },
    {
      id: "s2",
      title: "Scarpe Casual Marroni",
      category: "shoes",
      price: 159,
      image: "/images/scarpe-marroni.png",
    },
  ];