import { convertProps } from './HelperUtils'
import {
  getCurrentSrcData,
  getFirstImage,
  hasImageArray,
  hasPictureElement,
} from './ImageUtils'
import { createArtDirectionSources, hasArtDirectionArray } from './MediaUtils'
import { isBrowser } from './SimpleUtils'

/**
 * Creates an image reference to be activated on critical or visibility.
 * @param props
 * @param onLoad
 * @return {HTMLImageElement|null|Array}
 */
export const createPictureRef = (props, onLoad) => {
  const convertedProps = convertProps(props)

  if (
    isBrowser() &&
    (typeof convertedProps.fluid !== `undefined` ||
      typeof convertedProps.fixed !== `undefined`)
  ) {
    if (
      hasImageArray(convertedProps) &&
      !hasArtDirectionArray(convertedProps)
    ) {
      return createMultiplePictureRefs(props, onLoad)
    }
    const img = new Image()

    img.onload = () => onLoad()

    if (!img.complete && typeof convertedProps.onLoad === `function`) {
      img.addEventListener('load', convertedProps.onLoad)
    }
    if (typeof convertedProps.onError === `function`) {
      img.addEventListener('error', convertedProps.onError)
    }
    if (convertedProps.crossOrigin) {
      img.crossOrigin = convertedProps.crossOrigin
    }

    // Only directly activate the image if critical (preload).
    if (convertedProps.critical || convertedProps.isVisible) {
      return activatePictureRef(img, convertedProps)
    }

    return img
  }
  return null
}

/**
 * Creates multiple image references. Internal function.
 *
 * @param props   object    Component Props (with fluid or fixed as array).
 * @param onLoad  function  Callback for load handling.
 */
export const createMultiplePictureRefs = (props, onLoad) => {
  const convertedProps = convertProps(props)

  // Extract Image Array.
  const imageStack = convertedProps.fluid || convertedProps.fixed
  return imageStack.map(imageData => {
    if (convertedProps.fluid) {
      return createPictureRef({ ...convertedProps, fluid: imageData }, onLoad)
    }
    return createPictureRef({ ...convertedProps, fixed: imageData }, onLoad)
  })
}

/**
 * Creates a picture element for the browser to decide which image to load.
 *
 * @param imageRef
 * @param props
 * @param selfRef
 * @return {null|Array|*}
 */
export const activatePictureRef = (imageRef, props, selfRef = null) => {
  const convertedProps = convertProps(props)
  if (
    isBrowser() &&
    (typeof convertedProps.fluid !== `undefined` ||
      typeof convertedProps.fixed !== `undefined`)
  ) {
    if (
      hasImageArray(convertedProps) &&
      !hasArtDirectionArray(convertedProps)
    ) {
      return activateMultiplePictureRefs(imageRef, props, selfRef)
    }
    // Clone body to get the correct sizes.
    const bodyClone = document.body.cloneNode(true)
    // Do we have an Art-direction array? Then get its first(smallest) image.
    const imageData = hasArtDirectionArray(convertedProps)
      ? getFirstImage(convertedProps)
      : getCurrentSrcData(convertedProps)

    // Prevent adding HTMLPictureElement if it isn't supported (e.g. IE11),
    // but don't prevent it during SSR.
    if (hasPictureElement()) {
      const pic = document.createElement('picture')
      if (selfRef) {
        // Set original component's style.
        pic.width = imageRef.width = selfRef.offsetWidth
        pic.height = imageRef.height = selfRef.offsetHeight
      }
      // TODO: check why only the 1400 image gets loaded & single / stacked images don't!
      if (hasArtDirectionArray(convertedProps)) {
        const sources = createArtDirectionSources(convertedProps).reverse()
        sources.forEach(currentSource => pic.appendChild(currentSource))
      }
      if (imageData.srcSetWebp) {
        const sourcesWebP = document.createElement('source')
        sourcesWebP.type = `image/webp`
        sourcesWebP.srcset = imageData.srcSetWebp
        sourcesWebP.sizes = imageData.sizes
        pic.appendChild(sourcesWebP)
      }
      pic.appendChild(imageRef)
      bodyClone.appendChild(pic)
    } else if (selfRef) {
      imageRef.width = selfRef.offsetWidth
      imageRef.height = selfRef.offsetHeight
    }

    imageRef.srcset = imageData.srcSet ? imageData.srcSet : ``
    imageRef.src = imageData.src ? imageData.src : ``

    return imageRef
  }
  return null
}

/**
 * Creates multiple picture elements.
 *
 * @param imageRefs
 * @param props
 * @param selfRef
 * @return {Array||null}
 */
export const activateMultiplePictureRefs = (imageRefs, props, selfRef) => {
  const convertedProps = convertProps(props)

  // Extract Image Array.
  return imageRefs.map((imageRef, index) => {
    if (convertedProps.fluid) {
      return activatePictureRef(
        imageRef,
        {
          ...convertedProps,
          fluid: convertedProps.fluid[index],
        },
        selfRef
      )
    }
    return activatePictureRef(
      imageRef,
      {
        ...convertedProps,
        fixed: convertedProps.fixed[index],
      },
      selfRef
    )
  })
}