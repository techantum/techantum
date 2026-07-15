'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface AppImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    fill?: boolean;
    sizes?: string;
    onClick?: () => void;
    fallbackSrc?: string;
    loading?: 'lazy' | 'eager';
    fetchPriority?: 'high' | 'low' | 'auto';
    [key: string]: any;
}

function AppImage({
    src,
    alt,
    width,
    height,
    className = '',
    priority = false,
    quality = 85,
    placeholder = 'empty',
    blurDataURL,
    fill = false,
    sizes,
    onClick,
    fallbackSrc = '/assets/images/no_image.png',
    loading,
    fetchPriority,
    ...props
}: AppImageProps) {
    const [imageSrc, setImageSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // More reliable external URL detection
    const isExternal = imageSrc.startsWith('http://') || imageSrc.startsWith('https://');
    const isLocal = imageSrc.startsWith('/') || imageSrc.startsWith('./') || imageSrc.startsWith('data:');

    const handleError = () => {
        if (!hasError && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(true);
        }
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const commonClassName = `${className} ${isLoading ? 'bg-gray-200' : ''} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`;
    
    // Determine loading strategy
    const loadingStrategy = loading || (priority ? 'eager' : 'lazy');
    const fetchPriorityValue = fetchPriority || (priority ? 'high' : 'auto');

    // For external URLs or when in doubt, use regular img tag with loading="lazy"
    if (isExternal && !isLocal) {
        const imgStyle: React.CSSProperties = {};

        if (width) imgStyle.width = width;
        if (height) imgStyle.height = height;

        if (fill) {
            return (
                <div className={`relative ${className}`} style={{ width: width || '100%', height: height || '100%' }}>
                    <img
                        src={imageSrc}
                        alt={alt}
                        width={width}
                        height={height}
                        className={`${commonClassName} absolute inset-0 w-full h-full object-cover`}
                        onError={handleError}
                        onLoad={handleLoad}
                        onClick={onClick}
                        loading={loadingStrategy}
                        decoding="async"
                        fetchPriority={fetchPriorityValue}
                        style={imgStyle}
                        {...props}
                    />
                </div>
            );
        }

        return (
            <img
                src={imageSrc}
                alt={alt}
                width={width}
                height={height}
                className={commonClassName}
                onError={handleError}
                onLoad={handleLoad}
                onClick={onClick}
                loading={loadingStrategy}
                decoding="async"
                fetchPriority={fetchPriorityValue}
                style={imgStyle}
                {...props}
            />
        );
    }

    // For local images, use Next.js Image optimization (skip SVG)
    const isSvg = imageSrc.endsWith('.svg') || imageSrc.includes('.svg?');
    const imageProps = {
        src: imageSrc,
        alt,
        className: commonClassName,
        priority,
        quality,
        placeholder,
        blurDataURL,
        unoptimized: isSvg,
        onError: handleError,
        onLoad: handleLoad,
        onClick,
        loading: loadingStrategy,
        ...props,
    };

    if (fill) {
        return (
            <div className={`relative ${className}`}>
                <Image
                    {...imageProps}
                    fill
                    sizes={sizes || '100vw'}
                    style={{ objectFit: 'cover' }}
                />
            </div>
        );
    }

    return (
        <Image
            {...imageProps}
            width={width || 400}
            height={height || 300}
        />
    );
}

export default AppImage;