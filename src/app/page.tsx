
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { generateMemeImage, type GenerateMemeImageOutput } from "@/ai/flows/generate-meme-image";
import { generateAudio, type GenerateAudioOutput } from "@/ai/flows/generate-audio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles, Download, Trophy, Send, Share2, Link as LinkIcon, Volume2, Wallet, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";

const jokeCategories = [
    { id: "dad jokes", label: "Dad Jokes", sfw: true },
    { id: "dark humor", label: "Dark Humor", sfw: false },
    { id: "pick-up lines", label: "Pick-up Lines", sfw: true },
    { id: "crypto memes", label: "Crypto Memes", sfw: true },
    { id: "roasts", label: "Roasts", sfw: false },
    { id: "wholesome jokes", label: "Wholesome Jokes", sfw: true },
    { id: "ai jokes", label: "AI Jokes", sfw: true },
    { id: "edgy memes", label: "Edgy Memes", sfw: false },
];

function setMeta(url: string, description: string) {
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(el => el.remove());
    
    const ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    ogImage.setAttribute('content', url);
    document.head.appendChild(ogImage);

    const twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    twitterImage.setAttribute('content', url);
    document.head.appendChild(twitterImage);

    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
}

export default function LaughFactoryPage() {
    const [category, setCategory] = useState(jokeCategories[0].id);
    const [joke, setJoke] = useState<GenerateSafeJokeOutput | null>(null);
    const [usedJokes, setUsedJokes] = useState<string[]>([]);
    const [memeImage, setMemeImage] = useState<GenerateMemeImageOutput | null>(null);
    const [audio, setAudio] = useState<GenerateAudioOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const { toast } = useToast();
    const memeCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const isMemeCategory = category === 'crypto memes' || category === 'edgy memes';
        if (!joke) {
            setMeta('https://placehold.co/1200x630.png', 'Your daily dose of AI-powered humor');
            return;
        }

        if (isMemeCategory && memeImage?.imageDataUri) {
            // Delay screenshot for social media sharing until image is loaded
            setTimeout(() => takeMemeScreenshot(setMeta), 100);
        } else {
             setMeta('https://placehold.co/1200x630.png', joke.joke);
        }
    }, [joke, memeImage, category]);

    const takeMemeScreenshot = async (callback: (dataUrl: string, description: string) => void) => {
        const element = memeCardRef.current;
        if (!element) return;

        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(element, { 
                useCORS: true,
                allowTaint: true,
                backgroundColor: null, 
            });
            const dataUrl = canvas.toDataURL('image/png');
            if(callback) callback(dataUrl, joke?.joke || '');
            return dataUrl;
        } catch (error) {
            console.error("Failed to capture meme screenshot:", error);
            // Fallback to the raw image if screenshot fails
            if(callback) callback(memeImage?.imageDataUri || '', joke?.joke || '');
            return memeImage?.imageDataUri;
        }
    };

    const handleGenerateJoke = async () => {
        setIsLoading(true);
        setJoke(null);
        setMemeImage(null);
        setAudio(null);
        setSelectedReaction(null);
        try {
            const selectedCategory = jokeCategories.find(cat => cat.id === category);
            if (!selectedCategory) {
                throw new Error("Category not found");
            }

            const isSfw = selectedCategory.sfw;
            const isMemeCategory = category === 'crypto memes' || category === 'edgy memes';

            const jokeResult = await generateSafeJoke({ category, safeForWork: isSfw, usedJokes });
            setJoke(jokeResult);
            setUsedJokes(prev => [...prev, jokeResult.joke]);


            if (isMemeCategory) {
                const memeResult = await generateMemeImage({ category, safeForWork: isSfw, joke: jokeResult.joke });
                setMemeImage(memeResult);
            }

        } catch (error) {
            console.error("Failed to generate joke/meme:", error);
            toast({
                title: "Error",
                description: "Oops! Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: "The joke has been copied to your clipboard.",
        });
    };
    
    const handleDownloadMeme = async () => {
        const imageUri = await takeMemeScreenshot(() => {});
        if (imageUri) {
            const link = document.createElement("a");
            link.download = "haha-launch-meme.png";
            link.href = imageUri;
            link.click();
        }
    };

    const handleCategoryChange = (value: string) => {
        const selectedCat = jokeCategories.find(cat => cat.id === value);
        if (selectedCat) {
            setCategory(value);
        }
    };

    const handleShare = (platform: 'twitter' | 'telegram' | 'reddit' | 'copy') => {
        const jokeText = joke?.joke || '';
        const pageUrl = window.location.href;
        const encodedText = encodeURIComponent(jokeText);
        const encodedUrl = encodeURIComponent(pageUrl);

        if (platform === 'copy') {
             navigator.clipboard.writeText(pageUrl);
             toast({ title: "Link Copied!", description: "The link has been copied to your clipboard." });
             return;
        }

        let shareUrl = '';
        switch(platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'reddit':
                shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent('Check out this joke from HAHA LAUNCH!')}`;
                break;
        }
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    const handleGenerateAudio = async (text: string) => {
        if (!text) return;
        setIsGeneratingAudio(true);
        setAudio(null);
        try {
            const audioResult = await generateAudio(text);
            setAudio(audioResult);
        } catch (error) {
            console.error("Failed to generate audio:", error);
            toast({
                title: "Audio Error",
                description: "Couldn't generate audio for this joke.",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const splitJoke = (text: string): { top: string; bottom: string } => {
        if (!text) return { top: '', bottom: '' };
    
        // Split by sentences. A simple regex for sentence-ending punctuation.
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
        // If there's only one sentence, split by words.
        if (sentences.length <= 1) {
            const words = text.split(' ');
            if (words.length === 1) return { top: text, bottom: '' };
            const middleIndex = Math.ceil(words.length / 2);
            const top = words.slice(0, middleIndex).join(' ');
            const bottom = words.slice(middleIndex).join(' ');
            return { top, bottom };
        }
    
        // If multiple sentences, find a good split point.
        const middleIndex = Math.ceil(sentences.length / 2);
        const top = sentences.slice(0, middleIndex).join(' ').trim();
        const bottom = sentences.slice(middleIndex).join(' ').trim();
    
        return { top, bottom };
    };

    const MemeText = ({ text }: { text: string }) => (
        <p
          className="w-full text-center text-2xl md:text-4xl font-bold uppercase text-white break-words px-2"
          style={{
            textShadow: '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 3px 0px 0 #000, -3px 0px 0 #000, 0px 3px 0 #000, 0px -3px 0 #000'
          }}
        >
          {text}
        </p>
    );

    const ShareMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Share joke" className="rounded-full">
                    <Share2 className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                 <DropdownMenuItem onClick={() => handleShare('twitter')}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    <span>Twitter</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('telegram')}>
                     <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.17.9-.502 1.201-1.233 1.201-.859 0-1.31-.362-1.826-.856-1.024-.985-1.59-1.59-2.545-2.522-.984-.958-.352-1.488.24-2.203.11-.129.21-.264.315-.405.471-.624.942-1.248 1.408-1.868.087-.113.174-.227.26-.339.09-.121.018-.216-.109-.192-.15.03-.43.14-.735.33-.428.27-.84.54-1.22.81-.79.55-1.58.9-2.37.64-.87-.3-1.53-.94-2.19-1.58-.6-.58-1.17-1.44-.98-2.31.2-.95.83-1.84 1.4-2.31.57-.47 1.27-.75 2.1-.86 1.05-.13 2.07.16 2.9.62.24.13.48.27.72.4.1.06.2.12.28.18.09.06.18.03.21-.07.03-.11.05-.22.05-.33z"></path></svg>
                    <span>Telegram</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('reddit')}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87s-7.004-2.176-7.004-4.87c0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.34.34 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12.422a1.223 1.223 0 0 1-1.223-1.223 1.223 1.223 0 0 1 1.223-1.223c.675 0 1.223.548 1.223 1.223a1.223 1.223 0 0 1-1.223 1.223zm5.5 0a1.223 1.223 0 0 1-1.223-1.223 1.223 1.223 0 0 1 1.223-1.223c.675 0 1.223.548 1.223 1.223a1.223 1.223 0 0 1-1.223 1.223zm.822 5.023c-.382.383-1.041.5-1.564.5s-1.182-.117-1.565-.5c-.387-.387-.502-1.044-.502-1.637 0-.593.115-1.25.502-1.637.382-.382 1.04-.5 1.565-.5s1.183.118 1.565.5c.386.386.502 1.044.502 1.637 0 .593-.116 1.25-.502 1.637z"></path></svg>
                    <span>Reddit</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                   <LinkIcon className="h-4 w-4 mr-2" />
                   <span>Copy Link</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const JokeCard = ({ children, className, innerRef }: { children: React.ReactNode, className?: string, innerRef?: React.Ref<HTMLDivElement> }) => (
      <Card ref={innerRef} className={cn("w-full animate-in fade-in-0 zoom-in-95 duration-500 bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl", className)}>
        {children}
      </Card>
    );

    const isMemeCategory = category === 'crypto memes' || category === 'edgy memes';
    const { top, bottom } = splitJoke(joke?.joke || '');

    const dailyJoke = { joke: "I told my wife she should embrace her mistakes. She gave me a hug.", creator: "Comedian_AI", likes: 1337 };


    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 pt-12 dark">
            <main className="w-full max-w-3xl mx-auto flex flex-col items-center space-y-8">
                <header className="text-center w-full space-y-2">
                    <h1 className="text-6xl md:text-7xl font-bold font-headline text-primary tracking-tighter">HAHA LAUNCH</h1>
                    <p className="text-lg text-muted-foreground">Your daily dose of AI-powered humor</p>
                </header>

                <JokeCard className="border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-amber-400">
                            <Crown className="h-7 w-7" /> Daily Joke Winner
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-medium">{dailyJoke.joke}</p>
                        <div className="flex items-center gap-4 mt-4">
                            <p className="text-sm text-muted-foreground">- by {dailyJoke.creator}</p>
                            <div className="flex items-center gap-1 text-lg font-bold text-green-400">
                               <span>😂</span>
                               <span>{dailyJoke.likes}</span>
                            </div>
                        </div>
                    </CardContent>
                </JokeCard>
                
                <section className="w-full space-y-6">
                    <div>
                      <Label className="text-lg font-semibold mb-4 block text-center">1. Choose a Category</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {jokeCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            data-state={category === cat.id ? 'active' : 'inactive'}
                            className="px-4 py-3 text-sm font-semibold rounded-full transition-all duration-200 ease-out transform active:scale-95
                            data-[state=inactive]:bg-card data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-card/70 data-[state=inactive]:shadow-md
                            data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105"
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                </section>
                
                <div className="w-full min-h-[300px] flex items-center justify-center">
                    {isLoading && (
                         <JokeCard>
                            <CardHeader>
                                <Skeleton className="h-8 w-3/4 rounded-md" />
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <Skeleton className="h-48 w-full rounded-md" />
                                <div className="flex justify-end gap-2">
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                </div>
                            </CardContent>
                        </JokeCard>
                    )}
                    
                    {!isLoading && joke && isMemeCategory && memeImage && (
                        <JokeCard innerRef={memeCardRef}>
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-2xl font-bold font-headline">Meme Generated!</CardTitle>
                                <div className="flex items-center">
                                    <ShareMenu />
                                    <Button variant="ghost" size="icon" onClick={handleDownloadMeme} aria-label="Download meme" className="rounded-full">
                                        <Download className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="relative">
                                <img src={memeImage.imageDataUri} alt="Generated Meme background" className="w-full h-auto rounded-lg border-2" />
                                <div className="absolute inset-0 flex flex-col justify-between p-4">
                                  <MemeText text={top} />
                                  <MemeText text={bottom} />
                                </div>
                            </CardContent>
                        </JokeCard>
                    )}

                    {!isLoading && joke && (!isMemeCategory || (isMemeCategory && !memeImage)) && (
                         <JokeCard>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <CardTitle className="text-2xl font-bold font-headline">Here's a good one!</CardTitle>
                                <div className="flex items-center">
                                    <ShareMenu />
                                     <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleGenerateAudio(joke.joke)}
                                        disabled={isGeneratingAudio}
                                        aria-label="Read joke aloud"
                                        className="rounded-full"
                                    >
                                        {isGeneratingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(joke.joke)} aria-label="Copy joke" className="rounded-full">
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-medium leading-relaxed">{joke.joke}</p>
                                 {audio?.media && (
                                    <div className="mt-4">
                                        <audio controls autoPlay className="w-full">
                                            <source src={audio.media} type="audio/wav" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                )}
                                <div className="flex justify-end items-center space-x-2 mt-6">
                                    <Button variant={selectedReaction === 'laugh' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedReaction('laugh')} className="rounded-full text-2xl transform transition-transform duration-200 hover:scale-125 active:scale-100">
                                        <span>😂</span>
                                    </Button>
                                    <Button variant={selectedReaction === 'neutral' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedReaction('neutral')} className="rounded-full text-2xl transform transition-transform duration-200 hover:scale-125 active:scale-100">
                                        <span>😐</span>
                                    </Button>
                                    <Button variant={selectedReaction === 'unamused' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedReaction('unamused')} className="rounded-full text-2xl transform transition-transform duration-200 hover:scale-125 active:scale-100">
                                        <span>🙄</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </JokeCard>
                    )}
                </div>
            </main>

            <footer className="sticky bottom-0 w-full flex justify-center p-4 mt-8">
                 <div className="bg-card/80 backdrop-blur-lg p-2 rounded-full shadow-lg flex items-center gap-2 border">
                    <Button onClick={handleGenerateJoke} disabled={isLoading} size="lg" className="rounded-full font-bold text-lg flex-1 shadow-md">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-6 w-6" />
                        )}
                        Generate Joke
                    </Button>
                     <Button asChild variant="secondary" className="rounded-full shadow-md bg-green-500 text-white hover:bg-green-600">
                       <Link href="/submit"><Send className="mr-2 h-4 w-4" /> Submit</Link>
                    </Button>
                    <Button asChild variant="secondary" className="rounded-full shadow-md bg-green-500 text-white hover:bg-green-600">
                        <Link href="/submit"><Trophy className="mr-2 h-4 w-4" /> Board</Link>
                    </Button>
                    <Button variant="secondary" className="rounded-full shadow-md bg-green-500 text-white hover:bg-green-600">
                       <Wallet className="mr-2 h-4 w-4" /> Connect
                    </Button>
                 </div>
            </footer>
        </div>
    );
}
