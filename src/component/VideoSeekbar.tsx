"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const convertToTimeFormat = (seconds:number)=>{
    if(seconds<0) return ""
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const SyncedSlider = React.forwardRef((
  {max, min, value:parentValue, width = 150, onChange = (value:number)=>{}, onDragStopped = (value:number)=>{}, dragHover=false, isTime=false}:{
    max:number,
    min: number,
    value:number,
    width: number,
    onChange: (value:number)=>void,
    onDragStopped?: (value:number)=>void,
    dragHover?: boolean,
    isTime?: boolean
  }, ref
) => {
  const [currentValue, setCurrentValue]=useState<number>(
    inRange(parentValue, min, max) ? parentValue : min
  )
  const [barDimensionWidth, setBarDimensionWidth]= useState<number>(width)
  const [toolTipValue, setToolTipValue]=useState<string>("")
  const sliderRef = useRef<HTMLDivElement | null> (null)
  const thumbRef = useRef<HTMLDivElement | null> (null)
  const toolTipRef = useRef<HTMLDivElement | null>(null)

  React.useImperativeHandle(ref, ()=>{
    return {
        updatePosition: (value:number)=>{
            setCurrentValue(value)
        }
    }
  })
  const thumbLeftPercentage = ((currentValue)/(max-min)*100) - ((thumbDimensionPX.width)/(2*barDimensionWidth))*100
  const trackWidthPercentage = currentValue/(max-min) * 100


  const handleDrag = (evt: MouseEvent | TouchEvent)=>{
    if(sliderRef.current){
      const isTouchEvent : boolean = "touches" in evt;
      const rect = sliderRef.current.getBoundingClientRect()
      const clientX = isTouchEvent ? (evt as TouchEvent).touches[0].clientX: (evt as MouseEvent).clientX
      let offsetX = clientX - rect.left
      if(offsetX<0) offsetX=0;
      const newValue = Math.round((offsetX / barDimensionWidth) * (max - min) + min);

      setCurrentValue(Math.max(min, Math.min(max, newValue)));
      onChange(Math.max(min, Math.min(max, newValue)));
      if(thumbRef.current) thumbRef.current.classList.add("scale-100");
      if(dragHover && toolTipRef.current){
        const toolTipLeftPercentage = Math.min(100,(offsetX/barDimensionWidth)*100)
        toolTipRef.current.style.left = `${toolTipLeftPercentage}%`
        toolTipRef.current.classList.remove("hidden")
        toolTipRef.current.classList.add("flex")
        setToolTipValue(convertToTimeFormat(Math.min(max, Math.max(newValue, min))))
      }
    }
  }

  useLayoutEffect(()=>{
    updateSliderWidth()
  },[])

  const updateSliderWidth = React.useCallback(()=>{
    const w = sliderRef.current?.getBoundingClientRect().width
    if(w) setBarDimensionWidth(w)
  },[])

  useEffect(()=>{
    document.addEventListener("fullscreenchange", updateSliderWidth)
    window.addEventListener("resize", updateSliderWidth)
    window.addEventListener("orientationchange",updateSliderWidth)
    return ()=>{
      document.removeEventListener("fullscreenchange", updateSliderWidth)
      window.removeEventListener("resize", updateSliderWidth)
      window.removeEventListener("orientationchange",updateSliderWidth)
    }
  },[])

  useEffect(()=>{
    setCurrentValue(parentValue)
  },[parentValue])
  return (
    <div
      ref={sliderRef}
      style={
        {
          width: "100%",
          height: barDimensionPX.height
        }
      }
      className='bg-zinc-400 relative flex items-center group cursor-pointer'
      onMouseMove={(e)=>{
        if(dragHover && sliderRef.current && toolTipRef.current){
          const rect = sliderRef.current.getBoundingClientRect()
          let offsetX = 'clientX' in e ? e.clientX - rect.left : 0;
          if(offsetX<0) offsetX=0;
          const newValue = Math.round((offsetX / barDimensionWidth) * (max - min) + min);
          const leftPercentage = Math.min(100, (offsetX/barDimensionWidth)*100)
          toolTipRef.current.style.left = `${leftPercentage}%`
          toolTipRef.current.classList.remove("hidden")
          toolTipRef.current.classList.add("flex")
          setToolTipValue(convertToTimeFormat((Math.min(max, Math.max(newValue, min)))))
        }
      }}
      onMouseLeave={(e)=>{
        if(dragHover && sliderRef.current && toolTipRef.current){
          toolTipRef.current?.classList.add("hidden")
          toolTipRef.current.classList.remove("flex")
        }
      }}

      onTouchStart={(e)=>{
        // supporting for mobile interaction
        e.stopPropagation();
        e.preventDefault();
        if(sliderRef.current){
          const rect = sliderRef.current.getBoundingClientRect()
          let offsetX =  e.touches[0].clientX - rect.left
          if(offsetX<0) offsetX = 0
          const newValue = Math.round((offsetX / barDimensionWidth) * (max - min) + min);
          setCurrentValue(Math.max(min, Math.min(max, newValue)));
          if (onChange) onChange(Math.max(min, Math.min(max, newValue)));
        }

        document.addEventListener("touchmove", handleDrag)
        document.addEventListener("touchend", ()=>{
          if(thumbRef.current) thumbRef.current.classList.remove("scale-100");
          document.removeEventListener("touchmove",handleDrag)
          if(toolTipRef.current && dragHover) toolTipRef.current.classList.add("hidden")
          onDragStopped(currentValue);
        }, {once: true})

      }}

      onMouseDown={(e)=>{
        if(sliderRef.current){
          const rect = sliderRef.current.getBoundingClientRect()
          let offsetX = 'clientX' in e ? e.clientX - rect.left : 0; // Support for touch events
          if(offsetX<0) offsetX=0
          const newValue = Math.round((offsetX / rect.width) * (max - min) + min);
          setCurrentValue(Math.max(min, Math.min(max, newValue)));
          if (onChange) onChange(Math.max(min, Math.min(max, newValue)));
        }


        document.addEventListener("mousemove", handleDrag)
        document.addEventListener("mouseup", (evt)=>{
          document.removeEventListener("mousemove",handleDrag)
          if(thumbRef.current) thumbRef.current.classList.remove("scale-100");
          if(toolTipRef.current && dragHover) toolTipRef.current.classList.add("hidden")
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
        {/* NOTE: thumb always appear on mobile device */}
      </div>
      <div
        className={`z-20 px-2 items-center justify-center bg-black text-white rounded-sm absolute -top-8 text-sm translate-x-[-50%] select-none  hidden`}
        ref={toolTipRef}
      >
        {/* dragHover tooltip */}
        <div
          className={`-bottom-1 w-2 h-2 z-10 bg-black rotate-45 absolute left-[50%] translate-x-[-50%]
            ${toolTipValue=="" ? "hidden": "block"}  
          `}
          
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
})

export default React.memo(SyncedSlider)