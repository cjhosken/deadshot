import { useEffect, useRef, useState } from "react";
import "./CustomSelect.css";

const CustomSelect = (
    {options, title} : {options : string[], title : string}
) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("persp");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div id="custom-select" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`customSelect ${open ? "active" : ""}`}
        title={title}
      >
        {selected}
      </button>

      {open && (
        <ul className="customSelectList">
          {options.map((opt) => (
            <li
              key={opt}
              onClick={() => {
                setSelected(opt);
                setOpen(false);
              }}
              className={`option ${selected === opt ? "active" : ""}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
