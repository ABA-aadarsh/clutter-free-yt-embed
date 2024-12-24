"use client";
import React, { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import Slider from './VolumeSeekbar'
import YouTube, { YouTubeEvent, YouTubePlayer, YouTubeProps } from 'react-youtube';
import { Gauge, Maximize, Minimize, Pause, Play, RefreshCcw} from 'lucide-react';
import ModifiedSlider from './VideoSeekbar';
import { MdOutlineForward10, MdOutlineReplay10 } from 'react-icons/md';
import { IoVolumeHigh, IoVolumeLow, IoVolumeMedium, IoVolumeMute } from 'react-icons/io5';

const extremelyLargeHeight = 100000
const durationInterval = 500 // ms
const playbackSpeedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]


const YT = React.forwardRef((
  { onPause, onPlay, onReady, onEnd, start, end, videoId }: {
    onPause: () => void,
    onPlay: () => void,
    onReady: ({ videoLength }: { videoLength: number }) => void,
    onEnd: () => void,
    start?: number,
    end?: number,
    videoId: string
  }, ref
) => {
  const playerRef = useRef<YouTubePlayer>(null)
  const opts: YouTubeProps["opts"] = {
    height: extremelyLargeHeight,
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      enablejsapi: 1,
      cc_lang_pref: "English",
      start: start,
      end: end
    }
  }
  const onReadyYT: YouTubeProps["onReady"] = async (e: YouTubeEvent) => {
    playerRef.current = e.target
    onReady({
      videoLength: await playerRef.current.getDuration()
    })
    playerRef.current.playVideo();
  }

  useImperativeHandle(ref, () => {
    return {
      pauseVideo: () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
      },
      playVideo: () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
        }
      },
      seek: async (seconds: number, allowSeekAhead: boolean) => {
        await playerRef.current?.seekTo(seconds, allowSeekAhead)
      },
      setVolume: async (v: number) => {
        if (v <= 100 && v >= 0) {
          await playerRef.current?.setVolume(v)
        }
      },
      getCurrentSeek: async (): Promise<number | null> => {
        const seekValue = await playerRef.current?.getCurrentTime()
        return (seekValue || null)
      },
      changePlaybackSpeed: async (newSpeed: number): Promise<void> => {
        await playerRef.current?.setPlaybackRate(newSpeed)
      }
    }
  })


  useEffect(() => {
    return () => {
      playerRef.current?.destroy()
    }
  }, [])

  return (
    <div className={`overflow-y-hidden flex items-center max-h-dvh w-full h-full`}
    >
      <YouTube
        videoId={videoId} //TODO: pass video id as prop
        opts={opts}
        iframeClassName=''
        className='inset-0 outline-none border-0 w-full'
        onReady={onReadyYT}
        onPause={onPause}
        onPlay={onPlay}
        onEnd={onEnd}
        loading='lazy'
      />
    </div>
  )
})

const MemoisedYT = React.memo(YT)

const EmbedYT = (
  { start = -1, end = -1, onEnd: onEndCallbackForParent = () => { }, videoId }: {
    start?: number,
    end?: number,
    onEnd?: () => void,
    videoId: string
  }
) => {
  const [isPaused, setIsPaused] = useState<boolean>(true)
  const [volume, setVolume] = useState<number>(-1) // -1 for the state when volume data hasn't grabbed from youtube
  const [currentPlaybackSpeed, setCurrentPlaybackSpeed] = useState<number>(-1)

  const [relativeVideoSeek, setRelativeVideoSeek] = useState<number>(0)
  const [relativeVideoLength, setRelativeVideoLength] = useState<number>(-1)
  const relativeVideoSeekRef = useRef<number>(0)
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)

  // Reference variables
  const YTReferencer = useRef<
    {
      pauseVideo: () => void,
      playVideo: () => void,
      seek: (seconds: number, allowSeekAhead: boolean) => Promise<void>,
      setVolume: (v: number) => Promise<void>,
      getCurrentSeek: () => Promise<number | null>,
      changePlaybackSpeed: (speed: number) => Promise<void>
    } | null
  >(null)
  const syncedSliderRef = useRef<
    {
      updatePosition: (value: number) => void
    }
  >(null)
  const videoStatusRef = useRef(
    {
      isPaused: true,
      playbackSpeed: 1,
      volumeBeforeMute: 25,
      start: start,
      end: end,
      shouldBePaused: true
    }
  )
  const controlContainerRef = useRef<HTMLDivElement>(null)
  const controlsHoverTimerRef = useRef<NodeJS.Timeout>(null)
  const timerIdRef = useRef<NodeJS.Timeout>(null)
  const isMouseOverControls = useRef<boolean>(false)
  const componentWrapperRef = useRef<HTMLDivElement>(null)
  const endScreenRef = useRef<HTMLDivElement>(null)


  const addNewRemoveInterval = React.useCallback((hideCursor:boolean = false) => {
    if (controlsHoverTimerRef.current) {
      clearTimeout(controlsHoverTimerRef.current)
      controlsHoverTimerRef.current = null
    }

    controlsHoverTimerRef.current = setTimeout(() => {
      if(!isMouseOverControls.current){
        controlContainerRef.current?.classList.add("invisible")
        if(componentWrapperRef.current){
          componentWrapperRef.current.classList.add("cursor-none")
        }
      }else{
        addNewRemoveInterval();
      }
    }, 3000)
  }, [])


  const currentTimeStringFormat: string = function (): string {
    if (relativeVideoSeek < 0) return ""
    const hours = Math.floor(relativeVideoSeek / 3600);
    const minutes = Math.floor((relativeVideoSeek % 3600) / 60);
    const secs = Math.floor(relativeVideoSeek % 60);

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }();

  const videoLengthStringFormat: string = React.useMemo(
    () => {
      if (relativeVideoLength < 0) return ""
      const hours = Math.floor(relativeVideoLength / 3600);
      const minutes = Math.floor((relativeVideoLength % 3600) / 60);
      const secs = Math.floor(relativeVideoLength % 60);
      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    , [relativeVideoLength])
  
  const updateVolume = async (v: number) => {
    v = Math.max(0, Math.min(v, 100))
    setVolume(v)
    videoStatusRef.current.volumeBeforeMute = v
    await YTReferencer.current?.setVolume(v)
    localStorage.setItem("embedYT-react-data", JSON.stringify(
      {
        volume: v,
        playbackSpeedOptions: currentPlaybackSpeed
      }
    ))
  }
  const updatePlaybackSpeed = async (s: number) => {
    if (playbackSpeedOptions.find(i => i == s)) {
      setCurrentPlaybackSpeed(s)
      videoStatusRef.current.playbackSpeed = s
      await YTReferencer.current?.changePlaybackSpeed(s)
      localStorage.setItem("embedYT-react-data", JSON.stringify(
        {
          volume: Math.max(0, Math.min(volume, 100)),
          playbackSpeed: s
        }
      ))
    }
  }
  const initialiseVariablesOnReady = React.useCallback((
    { videoLength }: {
      videoLength: number
    }
  ) => {
    let rvl = ((end == -1) ? videoLength : end) - ((start == -1) ? 0 : start) // relative video length
    setRelativeVideoLength(rvl)
    let v: number, s: number;
    const localStorageData = localStorage.getItem("embedYT-react-data")
    if (localStorageData && localStorageData != "") {
      const parsed: { volume: number, playbackSpeed: number } = JSON.parse(localStorageData)
      if (parsed.volume && typeof (parsed.volume) == "number" && parsed.volume <= 100 && parsed.volume >= 0) {
        v = parsed.volume
      } else {
        v = 50;
      }

      if (parsed.playbackSpeed && typeof (parsed.playbackSpeed) == "number" && parsed.playbackSpeed in playbackSpeedOptions) {
        s = parsed.playbackSpeed
      } else {
        s = 1
      }
    } else {
      v = 50;
      s = 1;
    }
    updateVolume(v)
    updatePlaybackSpeed(s)
  }, [])

  const startSeekTimer = () => {
    // starts a timer if existing timer does not exist
    if (!timerIdRef.current) {
      timerIdRef.current = setInterval(async () => {
        const actualSeek = await YTReferencer.current?.getCurrentSeek()
        if (actualSeek && !videoStatusRef.current.isPaused) {
          const relativeSeek = (start == -1) ? actualSeek : actualSeek - start
          relativeVideoSeekRef.current = relativeSeek
          setRelativeVideoSeek((prevValue) => {
            if (Math.abs(prevValue - relativeSeek) > 0.1) {
              return Math.round(relativeSeek);
            }
            return Math.round(prevValue);
          });
          syncedSliderRef.current?.updatePosition(relativeSeek)
        }
      }, durationInterval)
    }
  }

  const stopSeekTimer = () => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current)
      timerIdRef.current = null
    }
  }


  const onPause = React.useCallback(() => {
    videoStatusRef.current.isPaused = true
    stopSeekTimer();
    setIsPaused(true)
  }, [])
  const onPlay = React.useCallback(() => {
    videoStatusRef.current.isPaused = false
    startSeekTimer();
    setIsPaused(false)
  }, [])




  const handleFullscreenChange = ()=>{
    if(document.fullscreenElement==null){
      setIsFullScreen(false)
    }
    else if(document.fullscreenElement==componentWrapperRef.current){
      setIsFullScreen(true)
    }
  }

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      stopSeekTimer()
      document.removeEventListener("fullscreenchange",handleFullscreenChange)
    }
  }, [])
  return (
    <div
      className={` bg-zinc-900 relative text-white z-[100] max-w-full aspect-[16/9] overflow-hidden max-h-dvh`}
      ref={componentWrapperRef}
      onKeyDown={async (e) => {
        // keyboard event handlers
        e.stopPropagation()
        e.preventDefault();
        switch (e.key) {
          case "ArrowLeft":
            stopSeekTimer()
            relativeVideoSeekRef.current = Math.max(0, relativeVideoSeekRef.current - 5)
            setRelativeVideoSeek(relativeVideoSeekRef.current)
            syncedSliderRef.current?.updatePosition(relativeVideoSeekRef.current)
            await YTReferencer.current?.seek(
              (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
              , true)
            break
          case "ArrowRight":
            stopSeekTimer()
            relativeVideoSeekRef.current = Math.min(relativeVideoLength, relativeVideoSeekRef.current + 5)
            setRelativeVideoSeek(relativeVideoSeekRef.current)
            syncedSliderRef.current?.updatePosition(relativeVideoSeekRef.current)
            await YTReferencer.current?.seek(
              (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
              , true)
            break
          case "ArrowUp":
            updateVolume(volume + 5)
            break;
          case "ArrowDown":
            updateVolume(volume - 5)
            break;
          case " ":
            (!videoStatusRef.current.isPaused) ? YTReferencer.current?.pauseVideo() : YTReferencer.current?.playVideo()
            break
          case "Escape":
            if (document.fullscreenElement == componentWrapperRef.current) {
              document.exitFullscreen();
              setIsFullScreen(false)
            }
            break
        }
      }}
    >
      <MemoisedYT
        videoId={videoId}
        onEnd={() => {
          endScreenRef.current?.classList.remove("hidden")
          stopSeekTimer();
          setRelativeVideoSeek(relativeVideoLength)
          relativeVideoSeekRef.current = relativeVideoLength
          setIsVideoEnded(true)
          onEndCallbackForParent()
        }}
        onPause={onPause}
        onPlay={onPlay}
        onReady={initialiseVariablesOnReady}
        start={
          start == -1 ? undefined : start
        }
        end={
          end == -1 ? undefined : end
        }
        ref={YTReferencer}
      />
      {/* overlay */}
      <div
        tabIndex={0}
        onKeyUp={() => {
          startSeekTimer()
        }}
        autoFocus={true}
        className='absolute h-full w-full z-10 top-0 left-0 cursor-auto'
        onMouseMove={(e) => {
          const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
          controlContainerRef.current?.classList.remove("invisible")
          if(componentWrapperRef.current){
            componentWrapperRef.current.classList.remove("cursor-none")
          }
          if (!isMouseOverControls.current || isMobile) {
            addNewRemoveInterval(true);
          }
        }}
        onMouseLeave={(e) => {
          addNewRemoveInterval(true)
        }}
        onClick={(e) => {
          // pause and play interface TODO: touch interactiono display through fading effect
          // TODO: also make sure that when clicked on controls container this does not happen

          const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
          if (isMobile) return;
          if (videoStatusRef.current.isPaused) {
            YTReferencer.current?.playVideo()
          } else {
            YTReferencer.current?.pauseVideo()
          }
          const foo = document.querySelector(".playPauseFader")
          if (foo) {
            if (videoStatusRef.current.isPaused) {
              foo.querySelector(".onPause")?.classList.remove("hidden")
              foo.querySelector(".onPlay")?.classList.add("hidden")
            } else {
              foo.querySelector(".onPlay")?.classList.remove("hidden")
              foo.querySelector(".onPause")?.classList.add("hidden")
            }
            foo.classList.remove("hidden")
            setTimeout(() => {
              foo.classList.add("hidden")
            }, 1000)
          }
        }}
      >
        <div className='hidden absolute top-[50%] left-[50%] playPauseFader'
        >
          {/* touch interaction */}
          <div className='w-20 h-20 rounded-full flex items-center justify-center bg-zinc-600/50 opacity-75'>
            <Play fill='white' size={30} strokeWidth={1}
              className='absolute onPlay hidden'
            />
            <Pause fill='white' size={30} strokeWidth={1}
              className='absolute onPause hidden'
            />
          </div>
        </div>


        {
          (isPaused) && 
          <div className='translate-x-[-50%] translate-y-[-50%] absolute top-[50%] left-[50%] max-sm:flex hidden bg-zinc-600/95 w-10 h-10 items-center justify-center rounded-full'>
            <button
              onClick={()=>{
                YTReferencer.current?.playVideo();
              }}
            >
              <Play fill='white' size={18} strokeWidth={1}/>
            </button>
          </div>
        }

        <div
          className='absolute hidden w-full h-full top-0 left-0 flex items-center justify-center z-25 bg-black'
          ref={endScreenRef}
        >
          {/* End Screen */}
        </div>

        {/* controls wrapper */}
        <div
          className={`absolute bottom-0 left-0 w-full z-20 py-2`}
          onMouseEnter={() => {
            isMouseOverControls.current = true
          }}
          onMouseLeave={() => {
            isMouseOverControls.current = false
          }}
          onClick={e => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          {
            relativeVideoLength != -1
            &&
            <div
              className={`flex items-center justify-center relative z-30 w-full`}
              ref={controlContainerRef}
            >
              <div
                className='bottom-gradient'
              >{/* bottom gradient */}</div>
              <div className='w-full px-3 relative z-30'>
                <ModifiedSlider
                  min={0}
                  max={relativeVideoLength == -1 ? 100 : relativeVideoLength}
                  value={0}
                  width={1}
                  dragHover={
                    relativeVideoLength != -1
                  }
                  onChange={async (value) => {
                    // runs when value is changed through dragging
                    if (relativeVideoLength == -1) return;
                    if(timerIdRef.current!=null){
                      videoStatusRef.current.shouldBePaused=videoStatusRef.current.isPaused
                    }
                    stopSeekTimer();
                    relativeVideoSeekRef.current = value

                    if (relativeVideoSeekRef.current != relativeVideoLength && isVideoEnded) {
                      setIsVideoEnded(false)
                      endScreenRef.current?.classList.add("hidden")
                    }
                    setRelativeVideoSeek(value)
                    YTReferencer.current?.seek(
                      (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
                    , false)
                  }}
                  onDragStopped={async () => {
                    if (relativeVideoLength == -1) return;
                    YTReferencer.current?.seek(
                      (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
                    , true)
                    if(!videoStatusRef.current.shouldBePaused){
                      YTReferencer.current?.playVideo();
                    }
                    startSeekTimer();
                  }}
                  ref={syncedSliderRef}
                />
                <div className='flex items-center gap-5  mt-5'>
                  <div
                    className='flex items-center gap-5'
                  >
                    <button
                      className={`${isVideoEnded ? "hidden" : "block"}`}
                      onClick={
                        () => {
                          isPaused ? YTReferencer.current?.playVideo() : YTReferencer.current?.pauseVideo();
                        }
                      }
                    >
                      {isPaused ? <Play fill='white' strokeWidth={0} /> : <Pause fill='white' strokeWidth={0} />}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        stopSeekTimer()
                        relativeVideoSeekRef.current = 0
                        setRelativeVideoSeek(0)
                        YTReferencer.current?.seek(
                          (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
                          , true)
                        syncedSliderRef.current?.updatePosition(0)
                        endScreenRef.current?.classList.add("hidden")
                        setIsVideoEnded(false)
                        startSeekTimer();
                      }}
                      className={`${isVideoEnded ? "flex" : "hidden"} items-center flex-col justify-center gap-5`}
                    >
                      <RefreshCcw size={20} />
                    </button>
                  </div>
                  <div
                    className='flex items-center gap-2'
                  >
                    <button
                      onClick={()=>{
                        if(volume!=0){
                          const v = volume
                          updateVolume(0)
                          videoStatusRef.current.volumeBeforeMute = v
                        }else{
                          updateVolume(
                            videoStatusRef.current.volumeBeforeMute || 100
                          )
                        }
                      }}
                    >
                      {
                        volume == 0 && <IoVolumeMute fill='white' strokeWidth={1} size={24} />
                      }
                      {
                        ((volume > 0 && volume < 25) || volume == -1) && <IoVolumeLow fill='white' strokeWidth={1} size={24} />
                      }
                      {
                        (volume >= 25 && volume < 50) && <IoVolumeMedium fill='white' strokeWidth={1} size={24} />
                      }
                      {
                        (volume >= 50) && <IoVolumeHigh fill='white' strokeWidth={1} size={24} />
                      }
                    </button>
                    <Slider
                      min={0}
                      max={100}
                      value={volume == -1 ? 40 : volume}
                      width={75}
                      onChange={(value) => {
                        updateVolume(value)
                      }}
                    />
                  </div>
                  {
                    relativeVideoLength != -1 ?
                      <span
                        className='text-xs shrink-0 max-sm:hidden'
                      >{currentTimeStringFormat} / {videoLengthStringFormat}</span>
                      :
                      <span
                        className='text-xs shrink-0 max-sm:hidden'
                      >...</span>
                  }

                  <div className='flex items-center gap-3 justify-end flex-grow shrink-0'>
                    {/* options and fullscreen */}
                    <div className='flex items-center gap-5 mr-5 max-sm:hidden'>
                      <button
                        onClick={async e => {
                          e.stopPropagation()
                          stopSeekTimer()
                          relativeVideoSeekRef.current = Math.max(0, relativeVideoSeekRef.current - 10)
                          setRelativeVideoSeek(relativeVideoSeekRef.current)
                          syncedSliderRef.current?.updatePosition(relativeVideoSeekRef.current)
                          await YTReferencer.current?.seek(
                            (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
                            , true)
                          startSeekTimer()
                        }}
                      ><MdOutlineReplay10 size={24} /></button>
                      <button
                        onClick={async e => {
                          e.stopPropagation()
                          stopSeekTimer()
                          relativeVideoSeekRef.current = Math.min(relativeVideoLength, relativeVideoSeekRef.current + 10)
                          setRelativeVideoSeek(relativeVideoSeekRef.current)
                          syncedSliderRef.current?.updatePosition(relativeVideoSeekRef.current)
                          await YTReferencer.current?.seek(
                            (start == -1) ? relativeVideoSeekRef.current : relativeVideoSeekRef.current + start
                            , true)
                          startSeekTimer()
                        }}
                      ><MdOutlineForward10 size={24} /></button>
                    </div>

                    <button className='flex items-center gap-0 max-sm:hidden'
                      onClick={(e) => {
                        e.stopPropagation()
                        updatePlaybackSpeed((videoStatusRef.current.playbackSpeed + 0.25) <= 2 ? (videoStatusRef.current.playbackSpeed + 0.25) : 0.25)
                      }}
                    >
                      <Gauge size={20} />
                      <span
                        className=' text-xs inline-block w-6'
                      >{currentPlaybackSpeed}</span>
                    </button>
                    <button
                      onClick={() => {
                        const fsElement = document.fullscreenElement
                        if (fsElement == componentWrapperRef.current) {
                          document.exitFullscreen()
                          setIsFullScreen(false)
                        } else {
                          componentWrapperRef.current?.requestFullscreen();
                          setIsFullScreen(true)
                        }
                      }}
                      title="Toggle Fullscreen"
                    >
                      {
                        isFullScreen ?
                          <Minimize size={18} /> :
                          <Maximize size={18} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  )
}

export default EmbedYT