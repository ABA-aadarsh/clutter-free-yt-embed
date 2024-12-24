"use client";
import React, { useEffect, useRef, useState } from 'react'
const barDimensionPX = {
  width: 150,
  height: 4
}
const thumbDimensionPX = {
  width: 12,
  height: 12
}

const inRange = (x:number, l:number, h:number):boolean=>{
  return (x>=l && x<=h);
}
const Slider = (
  {max, min, value:parentValue, width = 150, onChange = (value:number)=>{}, onDragStopped = (value:number)=>{}, dragHover=false, isTime=false}:{
    max:number,
    min: number,
    value:number,
    width: number,
    onChange: (value:number)=>void,
    onDragStopped?: (value:number)=>void,
    dragHover?: boolean,
    isTime?: boolean
  }
) => {
  const [currentValue, setCurrentValue]=useState<number>(
    inRange(parentValue, min, max) ? parentValue : min
  )
  const [toolTipValue, setToolTipValue]=useState<number>(-1)
  const sliderRef = useRef<HTMLDivElement | null> (null)
  const thumbRef = useRef<HTMLDivElement | null> (null)
  const toolTipRef = useRef<HTMLDivElement | null>(null)
  
  barDimensionPX.width = width
  const thumbLeftPercentage = (currentValue)/(max-min)*100 - (thumbDimensionPX.width)/(barDimensionPX.width*2) * 100
  const trackWidthPercentage = currentValue/(max-min) * 100


  const handleDrag = (evt: MouseEvent | TouchEvent)=>{
    if(sliderRef.current){
      const isTouchEvent : boolean = "touches" in evt;
      const rect = sliderRef.current.getBoundingClientRect()
      const clientX = isTouchEvent ? (evt as TouchEvent).touches[0].clientX: (evt as MouseEvent).clientX
      let offsetX = clientX - rect.left
      if(offsetX<0) offsetX=0;
      const newValue = Math.round((offsetX / barDimensionPX.width) * (max - min) + min);
      console.log("New value to be set ont the slider is : ", newValue, rect.width)

      setCurrentValue(Math.max(min, Math.min(max, newValue)));
      onChange(Math.max(min, Math.min(max, newValue)));
      if(thumbRef.current) thumbRef.current.classList.add("scale-100");
    }
  }


  useEffect(()=>{
    setCurrentValue(parentValue)
  },[parentValue])
  return (
    <div
      ref={sliderRef}
      style={
        {
          width: barDimensionPX.width,
          height: barDimensionPX.height
        }
      }
      className='bg-zinc-400 relative flex items-center group cursor-pointer'

      onTouchStart={(e)=>{
        // supporting for mobile interaction
        e.stopPropagation();
        e.preventDefault();
        if(sliderRef.current){
          const rect = sliderRef.current.getBoundingClientRect()
          let offsetX =  e.touches[0].clientX - rect.left
          if(offsetX<0) offsetX = 0
          const newValue = Math.round((offsetX / barDimensionPX.width) * (max - min) + min);
          setCurrentValue(Math.max(min, Math.min(max, newValue)));
          if (onChange) onChange(Math.max(min, Math.min(max, newValue)));
        }

        document.addEventListener("touchmove", handleDrag)
        document.addEventListener("touchend", (evt)=>{
          console.log("DID touch event even run?")
          if(thumbRef.current) thumbRef.current.classList.remove("scale-100");
          document.removeEventListener("touchmove",handleDrag)
          onDragStopped(currentValue);
        }, {once: true})

      }}

      onMouseDown={(e)=>{
        if(sliderRef.current){
          const rect = sliderRef.current.getBoundingClientRect()
          const offsetX = 'clientX' in e ? e.clientX - rect.left : 0; // Support for touch events
          const newValue = Math.round((offsetX / rect.width) * (max - min) + min);
          setCurrentValue(Math.max(min, Math.min(max, newValue)));
          if (onChange) onChange(Math.max(min, Math.min(max, newValue)));
        }


        document.addEventListener("mousemove", handleDrag)
        document.addEventListener("mouseup", (evt)=>{
          document.removeEventListener("mousemove",handleDrag)
          if(thumbRef.current) thumbRef.current.classList.remove("scale-100");
          onDragStopped(currentValue);
        }, {once: true})
      }}
    >
      <div
        ref={thumbRef}
        style={
          {
            width: thumbDimensionPX.width,
            height: thumbDimensionPX.height,
            left: `${thumbLeftPercentage}%`
          }
        }
        className='absolute rounded-full bg-white group-hover:scale-100 scale-0 transition-transform duration-[35ms] cursor-pointer select-none max-lg:scale-100'
        draggable={false}
      >
        {/* thumb */}
      </div>
      <div
        className={`z-20 px-2 hidden items-center justify-center bg-black text-white rounded-sm absolute -top-8 text-sm translate-x-[-50%] select-none  ${dragHover? "group-hover:flex": "hidden"}`}
        ref={toolTipRef}
      >
        {/* dragHover tooltip */}
        <div
          className='-bottom-1 w-2 h-2 z-10 bg-black rotate-45 absolute left-[50%] translate-x-[-50%]'
          
        ></div>
        <span className='relative z-20'>{toolTipValue}</span>
      </div>
      <div
        style={
          {
            width: `${trackWidthPercentage}%`,
            height: barDimensionPX.height
          }
        }
        className='bg-white absolute left-0 select-none'
        draggable={false}
      >
        {/* track */}
      </div>
    </div>
  )
}

export default React.memo(Slider) 