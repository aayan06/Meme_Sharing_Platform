
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { generateMemeImage, type GenerateMemeImageOutput } from "@/ai/flows/generate-meme-image";
import { generateCustomMemeImage } from "@/ai/flows/generate-custom-meme-image";
import { createCustomMeme, type CreateCustomMemeOutput } from "@/ai/flows/create-custom-meme";
import { generateAudio, type GenerateAudioOutput } from "@/ai/flows/generate-audio";
import { voteOnMeme } from "@/ai/flows/vote-on-meme";
import { tipMemeCreator } from "@/ai/flows/tip-meme-creator";
import { deleteAllMemes } from "@/ai/flows/delete-all-memes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles, Download, Trophy, Send, Share2, Link as LinkIcon, Volume2, Crown, FileUp, Palette, PenSquare, Laugh, X, LogOut, Coins, Trash2, RefreshCcw, FileImage, MessageSquareOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import html2canvas from "html2canvas";


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
    if (typeof document === 'undefined') return;

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
    const { user, userData, setUserData } = useAuth();
    const [mode, setMode] = useState<'generate' | 'create' | 'leaderboard'>('generate');
    const [category, setCategory] = useState(jokeCategories[0].id);
    const [joke, setJoke] = useState<CreateCustomMemeOutput | GenerateSafeJokeOutput | null>(null);
    const [usedJokes, setUsedJokes] = useState<string[]>([]);
    const [memeImage, setMemeImage] = useState<GenerateMemeImageOutput | null>(null);
    const [audio, setAudio] = useState<GenerateAudioOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const [customMemeText, setCustomMemeText] = useState("");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showCaption, setShowCaption] = useState(true);
    const { toast } = useToast();
    const memeCardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
    const [votingStatus, setVotingStatus] = useState<Record<string, boolean>>({});
    const [tippingStatus, setTippingStatus] = useState<Record<string, boolean>>({});
    const [deletingStatus, setDeletingStatus] = useState<Record<string, boolean>>({});
    const [isDeletingAll, setIsDeletingAll] = useState(false);

     useEffect(() => {
        if (user) {
            const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });
            return () => unsub();
        }
    }, [user, setUserData]);

    useEffect(() => {
        if (mode === 'leaderboard') {
            const unsubscribe = fetchLeaderboard();
            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [mode]);

    const updateSocials = async () => {
        const imageUrl = memeImage?.imageDataUri || uploadedImage;
        if (joke?.joke && imageUrl) {
            setMeta(imageUrl, joke.joke);
        } else {
             setMeta('https://placehold.co/1200x630.png', 'Your daily dose of AI-powered humor');
        }
    }
    
    useEffect(() => {
        if (joke && (memeImage || uploadedImage)) {
            setTimeout(updateSocials, 100);
        }
    }, [joke, memeImage, uploadedImage]);


    const fetchLeaderboard = () => {
        setIsLoadingLeaderboard(true);
        const q = query(collection(db, "memes"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const leaderboardData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeaderboard(leaderboardData);
            setIsLoadingLeaderboard(false);
        }, (error) => {
            console.error("Error fetching leaderboard:", error);
            toast({ title: "Error", description: "Could not load the leaderboard.", variant: "destructive" });
            setIsLoadingLeaderboard(false);
        });

        return unsubscribe;
    };
    
    const handleVote = async (memeId: string) => {
        if (!user) {
            toast({ title: "Login Required", description: "You need to be logged in to vote.", variant: "destructive"});
            return;
        }
        setVotingStatus(prev => ({...prev, [memeId]: true}));
        try {
            const result = await voteOnMeme({ memeId, userId: user.uid });
            if (result.success) {
                toast({ title: "Vote Counted!", description: "You made this meme funnier."});
            } else {
                 toast({ title: "Vote Failed", description: result.message, variant: "destructive"});
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not cast your vote.", variant: "destructive"});
        } finally {
            setVotingStatus(prev => ({...prev, [memeId]: false}));
        }
    }

     const handleTip = async (meme: any) => {
        if (!user) {
            toast({ title: "Login Required", description: "You need to be logged in to tip.", variant: "destructive" });
            return;
        }
        setTippingStatus(prev => ({...prev, [meme.id]: true}));
        try {
            const result = await tipMemeCreator({
                memeId: meme.id,
                fromUserId: user.uid,
                toUserId: meme.userId
            });

            if (result.success) {
                toast({ title: "Tip Sent!", description: result.message });
            } else {
                toast({ title: "Tipping Failed", description: result.message, variant: "destructive" });
            }
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "Could not send your tip.", variant: "destructive" });
        } finally {
             setTippingStatus(prev => ({...prev, [meme.id]: false}));
        }
    };

    const handleDelete = async (memeId: string, imageUrl: string) => {
        if (!user) {
            toast({ title: "Login Required", description: "You need to be logged in to delete memes.", variant: "destructive" });
            return;
        }

        setDeletingStatus(prev => ({ ...prev, [memeId]: true }));
        try {
            // Delete Firestore document first
            await deleteDoc(doc(db, "memes", memeId));
            
            // Then, delete file from Storage
            if (imageUrl) {
                const storageRef = ref(storage, imageUrl);
                await deleteObject(storageRef);
            }
            
            toast({ title: "Meme Deleted", description: "Your meme has been removed." });
        } catch (error: any) {
            console.error("Delete failed:", error);
            if (error.code === 'storage/object-not-found') {
                 toast({ title: "Meme Deleted", description: "Record removed. The image was already gone." });
            } else {
                 toast({ title: "Deletion Failed", description: error.message || "Could not delete your meme.", variant: "destructive" });
            }
        } finally {
            setDeletingStatus(prev => ({ ...prev, [memeId]: false }));
        }
    };

    const handleDeleteAll = async () => {
        setIsDeletingAll(true);
        try {
            const result = await deleteAllMemes();
             toast({
                title: result.success ? "Leaderboard Cleared" : "Error",
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not clear the leaderboard.", variant: "destructive" });
        } finally {
             setIsDeletingAll(false);
        }
    }


    const handleGenerateNew = async () => {
        setIsLoading(true);
        setJoke(null);
        setMemeImage(null);
        setAudio(null);
        setSelectedReaction(null);
        setShowCaption(true);
        
        // In create mode, also clear the user's input to allow for a fresh start.
        if (mode === 'create') {
            setCustomMemeText('');
            setUploadedImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setIsLoading(false); 
            return;
        }
        
        try {
            if (mode === 'create') {
                 if (!customMemeText && !uploadedImage) {
                     toast({
                        title: "Meme Idea Needed",
                        description: "Please describe your meme idea or upload an image before generating.",
                        variant: "destructive",
                    });
                    setIsLoading(false);
                    return;
                }
                const jokeResult = await createCustomMeme({
                    topic: customMemeText || 'A funny meme about technology',
                    imageDataUri: uploadedImage || undefined,
                });
                setJoke(jokeResult);

                if (!uploadedImage) {
                    const memeResult = await generateCustomMemeImage(jokeResult.joke);
                    if (memeResult) {
                        setMemeImage(memeResult);
                    }
                }

            } else {
                const selectedCategory = jokeCategories.find(cat => cat.id === category);
                const isSfw = selectedCategory?.sfw ?? true;
                const isMemeCategory = category === 'crypto memes' || category === 'edgy memes';
                
                const jokeResult = await generateSafeJoke({ category: category, safeForWork: isSfw, usedJokes });
                setJoke(jokeResult);
                setUsedJokes(prev => [...prev, jokeResult.joke]);

                if (isMemeCategory) {
                    const memeResult = await generateMemeImage({ category, safeForWork: isSfw, joke: jokeResult.joke });
                    if (memeResult) {
                        setMemeImage(memeResult);
                    }
                }
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

    const handleRegenerate = async (type: 'text' | 'image' | 'both') => {
        if (!joke) return;
        setIsRegenerating(true);
        setShowCaption(true);
        
        try {
            const topic = mode === 'create' ? (customMemeText || 'A funny meme about technology') : category;
            const isSfw = mode === 'generate' ? (jokeCategories.find(c => c.id === topic)?.sfw ?? true) : true;
            let newJoke = joke;
            
            // Regenerate Text
            if (type === 'text' || type === 'both') {
                setAudio(null);
                const jokeResult = await createCustomMeme({ 
                    topic, 
                    imageDataUri: uploadedImage || (type === 'text' ? (memeImage?.imageDataUri) : undefined),
                });
                setJoke(jokeResult);
                newJoke = jokeResult;
            }
    
            // Regenerate Image
            if (type === 'image' || type === 'both') {
                 if (uploadedImage) {
                    toast({ title: "Action Not Allowed", description: "Cannot regenerate a user-uploaded image.", variant: "destructive" });
                 } else {
                     const imagePromptText = newJoke.joke;
                     const memeResult = mode === 'create'
                        ? await generateCustomMemeImage(imagePromptText)
                        : await generateMemeImage({ category: topic, safeForWork: isSfw, joke: imagePromptText });
                     if (memeResult) setMemeImage(memeResult);
                 }
            }
    
        } catch (error) {
            console.error("Failed to regenerate:", error);
            toast({ title: "Error", description: "Could not regenerate. Please try again.", variant: "destructive" });
        } finally {
            setIsRegenerating(false);
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
        if (!memeCardRef.current) return;

        try {
            const canvas = await html2canvas(memeCardRef.current, { 
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
             });
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = "haha-launch-meme.png";
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to download meme:", error);
            toast({
                title: "Download Error",
                description: "Could not download the meme image.",
                variant: "destructive"
            });
        }
    };
    
    const handleSubmit = async () => {
        if (!user) {
            toast({ title: "Not Logged In", description: "You must be logged in to submit a meme.", variant: "destructive" });
            return;
        }

        if (!memeCardRef.current && !uploadedImage) {
            toast({ title: "Error", description: "Meme element not found.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            let blob: Blob | null = null;

            if (uploadedImage && !joke) {
                // This is a direct upload of a finished meme
                blob = await fetch(uploadedImage).then((res) => res.blob());
            } else if (memeCardRef.current) {
                // This is a generated meme that needs to be canvas-rendered
                const canvas = await html2canvas(memeCardRef.current, { 
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                });
                const dataUrl = canvas.toDataURL("image/png");
                blob = await fetch(dataUrl).then((res) => res.blob());
            }

            if (!blob) {
                throw new Error("Could not create meme image data.");
            }


            const fileName = `${uuidv4()}.png`;
            const storageRef = ref(storage, `memes/${user.uid}/${fileName}`);
            
            const uploadResult = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            
            await addDoc(collection(db, "memes"), {
                imageUrl: downloadURL,
                joke: joke ? (showCaption ? (joke.joke || '') : '') : '',
                userId: user.uid,
                creatorHandle: userData?.displayName || user.email?.split('@')[0] || 'Anonymous',
                createdAt: serverTimestamp(),
                voteCount: 0,
                voters: [],
            });

            toast({ title: "Meme Submitted!", description: "Your meme is now on the leaderboard!" });
            
            setJoke(null);
            setMemeImage(null);
            setUploadedImage(null);
            setCustomMemeText('');
            setShowCaption(true);
            setMode('leaderboard');
        } catch (error: any) {
            console.error("Error submitting meme:", error);
            toast({ title: "Submission Error", description: error.message || "Could not submit your meme.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleCategoryChange = (value: string) => {
        const selectedCat = jokeCategories.find(cat => cat.id === value);
        if (selectedCat) {
            setCategory(value);
            setJoke(null);
            setMemeImage(null);
            setAudio(null);
            setSelectedReaction(null);
            setShowCaption(true);
        }
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setMemeImage(null); // Clear any generated image
                setJoke(null); // Clear joke as well, since it's a new meme context
                setShowCaption(true);
            };
            reader.readAsDataURL(file);
        } else {
            toast({
                title: "Invalid File",
                description: "Please upload a valid image file.",
                variant: "destructive"
            });
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

    const JokeCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
      <Card className={cn("w-full animate-in fade-in-0 zoom-in-95 duration-500 bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl", className)}>
        {children}
      </Card>
    );

    const MemeDisplayCard = ({ innerRef, children }: { innerRef?: React.Ref<HTMLDivElement>, children: React.ReactNode }) => (
        <div ref={innerRef} className="relative w-full">
            {children}
        </div>
    );

    const splitJoke = (text: string | undefined): { top: string; bottom: string } => {
        if (!text) return { top: '', bottom: '' };
        if (!text.includes('||')) {
            return { top: text.trim(), bottom: '' };
        }
        const parts = text.split('||');
        return { top: parts[0].trim(), bottom: parts.slice(1).join('||').trim() };
    };


    const handleModeChange = (newMode: 'generate' | 'create' | 'leaderboard') => {
        setMode(newMode);
        setJoke(null);
        setMemeImage(null);
        setAudio(null);
        setSelectedReaction(null);
        setCustomMemeText('');
        setUploadedImage(null);
        setShowCaption(true);
    };
    
    const isMemeReady = (joke && (memeImage?.imageDataUri || uploadedImage));
    const isMemeCategory = (mode === 'generate' && (category === 'crypto memes' || category === 'edgy memes'));
    const dailyJoke = { joke: "I TOLD MY WIFE SHE SHOULD EMBRACE HER MISTAKES.||SHE GAVE ME A HUG.", creator: "Comedian_AI", likes: 1337 };

    const navButtonClass = (isActive: boolean) =>
    cn(
        "flex-1 rounded-full text-sm sm:text-base font-semibold transition-colors duration-200",
        isActive
            ? "bg-primary text-primary-foreground"
            : "bg-card text-foreground hover:bg-muted"
    );

    const getRankClass = (index: number) => {
        switch (index) {
            case 0: return "border-yellow-400 border-4 shadow-yellow-400/50 shadow-lg";
            case 1: return "border-slate-400 border-4";
            case 2: return "border-orange-400 border-4";
            default: return "border-border";
        }
    };


    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 dark bg-background">
            <main className="w-full max-w-7xl mx-auto flex flex-col items-center space-y-8">
                 <header className="flex justify-between items-center w-full pt-4 sm:pt-2">
                    <div className="flex items-center gap-2">
                         <Laugh className="h-8 w-8 text-primary" />
                         <h1 className="text-2xl font-bold font-headline text-primary tracking-tighter">HAHA LAUNCH</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <div className="flex items-center gap-2 bg-card/80 backdrop-blur-lg rounded-full py-2 px-3 border">
                                   <Coins className="h-5 w-5 text-yellow-500"/>
                                   <span className="font-bold text-lg text-primary">{userData?.hahaBalance ?? 0}</span>
                                </div>
                                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">{user.email?.split('@')[0]}</span>
                                <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="rounded-full">
                                    <LogOut className="h-5 w-5" />
                                </Button>
                            </>
                        ) : (
                             <Button asChild>
                                <Link href="/auth">Login / Sign Up</Link>
                            </Button>
                        )}
                    </div>
                </header>
                
                 <div className="w-full max-w-lg flex justify-center p-1 bg-card backdrop-blur-lg rounded-full shadow-lg border">
                 <Button
                        onClick={() => handleModeChange('generate')}
                        className={navButtonClass(mode === 'generate')}
                        size="lg"
                    >
                        <Sparkles className="mr-2 h-5 w-5"/>
                        Generate
                    </Button>
                    <Button
                        onClick={() => handleModeChange('create')}
                        className={navButtonClass(mode === 'create')}
                        size="lg"
                        >
                        <PenSquare className="mr-2 h-5 w-5"/>
                        Create
                    </Button>
                     <Button
                        onClick={() => handleModeChange('leaderboard')}
                        className={navButtonClass(mode === 'leaderboard')}
                        size="lg"
                    >
                        <Trophy className="mr-2 h-5 w-5"/>
                        Leaderboard
                    </Button>
                </div>

                {mode === 'generate' && (
                  <div className="w-full max-w-3xl space-y-8">
                    <JokeCard className="border-primary/50 w-full animate-in fade-in-0 zoom-in-95 duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-amber-400">
                                <Crown className="h-7 w-7" /> Joke of the Day
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg sm:text-xl font-medium uppercase whitespace-pre-line">{dailyJoke.joke.replace('||', '\n')}</p>
                            <div className="flex items-center gap-4 mt-4">
                                <p className="text-sm text-muted-foreground">- by {dailyJoke.creator}</p>
                                <div className="flex items-center gap-1 text-lg font-bold text-primary">
                                   <span>😂</span>
                                   <span>{dailyJoke.likes}</span>
                                </div>
                            </div>
                        </CardContent>
                    </JokeCard>

                    <section className="w-full space-y-6 animate-in fade-in-0 zoom-in-95 duration-300">
                        <div>
                          <Label className="text-lg font-semibold mb-4 block text-center">1. Choose a Category</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                            {jokeCategories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.id)}
                                data-state={category === cat.id ? 'active' : 'inactive'}
                                className={cn(
                                    "px-3 py-3 sm:px-4 text-sm font-semibold rounded-full transition-all duration-200 ease-out transform active:scale-95",
                                    "text-foreground bg-card shadow-md hover:bg-muted",
                                    category === cat.id && "bg-primary text-primary-foreground scale-105"
                                )}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                    </section>
                  </div>
                )}

                {mode === 'create' && (
                     <Card className="w-full max-w-3xl bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl animate-in fade-in-0 zoom-in-95 duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
                               <Palette className="h-7 w-7" /> Meme Editor
                            </CardTitle>
                            <CardDescription>Create a meme from a topic, or upload your own image and text.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <Label htmlFor="custom-text" className="font-semibold">Meme Idea or Text (Top || Bottom)</Label>
                                <Textarea
                                    id="custom-text"
                                    placeholder="e.g., A meme about cats || that are bad at math"
                                    value={customMemeText}
                                    onChange={(e) => {
                                        setCustomMemeText(e.target.value)
                                        setJoke({ joke: e.target.value.toUpperCase() })
                                    }}
                                    className="mt-2"
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                 <Input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                                    <FileUp className="mr-2 h-5 w-5" />
                                    {uploadedImage ? "Change Image" : "Upload Image"}
                                </Button>
                                 <Button onClick={async () => {
                                    if (!customMemeText && !uploadedImage) {
                                        toast({ title: "Meme Idea Needed", description: "Please describe your meme idea or upload an image.", variant: "destructive" });
                                        return;
                                    }
                                    setIsLoading(true);
                                    try {
                                        const jokeResult = await createCustomMeme({
                                            topic: customMemeText || 'A funny meme about technology',
                                            imageDataUri: uploadedImage || undefined,
                                        });
                                        setJoke(jokeResult);
                                        if (!uploadedImage) {
                                            const memeResult = await generateCustomMemeImage(jokeResult.joke);
                                            if (memeResult) setMemeImage(memeResult);
                                        }
                                    } catch (e) {
                                        toast({ title: "Error", description: "Could not create meme.", variant: "destructive" });
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }} disabled={isLoading} className="flex-1">
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                    Generate AI Meme
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {mode === 'leaderboard' && (
                     <div className="w-full">
                        <CardHeader className="text-center">
                            <div className="flex items-center justify-center gap-4">
                                <CardTitle className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3"><Trophy className="w-8 h-8 text-yellow-500" /> Weekly Leaderboard</CardTitle>
                                {user && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={isDeletingAll}>
                                            {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            Delete All
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete all memes from the leaderboard and storage.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteAll}>Continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                )}
                            </div>
                            <CardDescription className="text-base sm:text-lg">The best memes as voted by the community. Tip creators you like!</CardDescription>
                        </CardHeader>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {isLoadingLeaderboard ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <Card key={i}>
                                        <CardContent className="p-4 space-y-4">
                                            <Skeleton className="w-full aspect-square rounded-lg" />
                                            <Skeleton className="h-4 w-3/4" />
                                            <div className="flex justify-between">
                                                <Skeleton className="h-8 w-20" />
                                                <Skeleton className="h-8 w-20" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                leaderboard.map((item, index) => (
                                    <Dialog key={item.id}>
                                        <Card className={cn("overflow-hidden group transition-all duration-300 hover:shadow-primary/40 hover:shadow-lg hover:-translate-y-1 relative flex flex-col", getRankClass(index))}>
                                            <CardContent className="p-0 flex-grow relative">
                                                {index === 0 && <Crown className="absolute top-2 right-2 h-8 w-8 text-yellow-400 drop-shadow-lg z-10" />}
                                                {item.imageUrl ? (
                                                    <DialogTrigger asChild>
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.joke || "Meme"}
                                                            className="w-full h-auto aspect-square object-cover cursor-pointer"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                if (target.src !== `https://placehold.co/600x600.png`) {
                                                                    target.src = `https://placehold.co/600x600.png`;
                                                                    target.setAttribute('data-ai-hint', 'image notFound');
                                                                }
                                                            }}
                                                        />
                                                    </DialogTrigger>
                                                ) : (
                                                    <div className="w-full aspect-square bg-muted flex items-center justify-center">
                                                        <span className="text-muted-foreground text-sm p-4 text-center">Image not available</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                            <CardFooter className="p-3 bg-card/50 backdrop-blur-lg flex-col items-start space-y-2 mt-auto">
                                                <p className="font-semibold text-xs text-primary">by {item.creatorHandle}</p>
                                                <div className="w-full flex justify-between items-center pt-2">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleTip(item)}
                                                            disabled={!user || tippingStatus[item.id] || item.userId === user?.uid}
                                                            className="rounded-full gap-1 text-sm"
                                                        >
                                                        {tippingStatus[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <>💰<span className="hidden sm:inline">Tip</span></>}
                                                        </Button>

                                                        {user && user.uid === item.userId && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        disabled={deletingStatus[item.id]}
                                                                        className="rounded-full gap-1 text-sm"
                                                                    >
                                                                        {deletingStatus[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This action cannot be undone. This will permanently delete your meme from the leaderboard.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(item.id, item.imageUrl)}>Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 font-bold text-primary text-lg">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleVote(item.id)}
                                                            disabled={!user || votingStatus[item.id] || (item.voters && user && item.voters.includes(user.uid))}
                                                            className="rounded-full text-lg"
                                                        >
                                                            {votingStatus[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : '😂'}
                                                        </Button>
                                                        <span>{item.voteCount}</span>
                                                    </div>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                        <DialogContent className="max-w-3xl p-0 border-0 bg-transparent shadow-none">
                                           <DialogHeader>
                                                <DialogTitle className="sr-only">{item.joke}</DialogTitle>
                                                <DialogDescription className="sr-only">
                                                    Meme by {item.creatorHandle}. Votes: {item.voteCount}.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <img src={item.imageUrl} alt={item.joke || "Meme"} className="w-full h-auto rounded-lg" />
                                            <DialogClose className="absolute -top-2 -right-2 bg-slate-800/80 text-white rounded-full">
                                                <X className="h-5 w-5"/>
                                            </DialogClose>
                                        </DialogContent>
                                    </Dialog>
                                ))
                            )}
                        </div>
                    </div>
                )}


                <div className="w-full max-w-3xl flex items-center justify-center">
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
                    
                    {!isLoading && (joke || uploadedImage) && (
                        <JokeCard>
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xl sm:text-2xl font-bold font-headline">
                                    {isMemeCategory || mode === 'create' ? "Your Meme" : "Here's a good one!"}
                                </CardTitle>
                                <div className="flex items-center">
                                    <ShareMenu />
                                    {(isMemeCategory || mode === 'create') && (memeImage?.imageDataUri || uploadedImage) && (
                                        <Button variant="ghost" size="icon" onClick={handleDownloadMeme} aria-label="Download meme" className="rounded-full">
                                            <Download className="h-5 w-5" />
                                        </Button>
                                    )}
                                    {!(isMemeCategory || mode === 'create') && joke && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleGenerateAudio(joke.joke.replace('||', '\n'))}
                                                disabled={isGeneratingAudio}
                                                aria-label="Read joke aloud"
                                                className="rounded-full"
                                            >
                                                {isGeneratingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(joke.joke.replace('||', '\n'))} aria-label="Copy joke" className="rounded-full">
                                                <Copy className="h-5 w-5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {memeImage?.imageDataUri || uploadedImage ? (
                                    <MemeDisplayCard innerRef={memeCardRef}>
                                        <img 
                                            src={memeImage?.imageDataUri || uploadedImage || ''} 
                                            alt={joke?.joke || 'Meme background'} 
                                            className="w-full h-auto rounded-lg border-2" 
                                            crossOrigin="anonymous"
                                        />
                                        {showCaption && joke && (
                                          <>
                                            <div
                                                className="absolute top-[2%] left-[5%] w-[90%] h-1/2 p-4 text-center text-white font-bold uppercase"
                                                style={{
                                                    fontSize: 'clamp(1rem, 5vw, 2.5rem)',
                                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.8)',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                              {splitJoke(joke.joke).top}
                                            </div>
                                            <div
                                                className="absolute bottom-[2%] left-[5%] w-[90%] h-1/2 p-4 text-center text-white font-bold uppercase"
                                                style={{
                                                    fontSize: 'clamp(1rem, 5vw, 2.5rem)',
                                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.8)',
                                                    display: 'flex',
                                                    alignItems: 'flex-end',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                              {splitJoke(joke.joke).bottom}
                                            </div>
                                          </>
                                        )}
                                    </MemeDisplayCard>
                                ) : (
                                    <>
                                       {joke && <p className="text-lg sm:text-xl font-medium leading-relaxed uppercase whitespace-pre-line">{joke.joke.replace('||', '\n')}</p>}
                                        {audio?.media && (
                                            <div className="mt-4">
                                                <audio controls autoPlay className="w-full">
                                                    <source src={audio.media} type="audio/wav" />
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                             <CardFooter className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-2">
                                {isMemeReady || uploadedImage ? (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <MessageSquareOff className="h-5 w-5 text-muted-foreground" />
                                            <Label htmlFor="show-caption-switch" className="text-sm font-medium">
                                                Show Caption
                                            </Label>
                                            <Switch
                                                id="show-caption-switch"
                                                checked={showCaption}
                                                onCheckedChange={setShowCaption}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" disabled={isRegenerating}>
                                                        {isRegenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCcw className="mr-2 h-5 w-5" />}
                                                        Regenerate
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleRegenerate('text')} disabled={isRegenerating}>Regenerate Text</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRegenerate('image')} disabled={isRegenerating || !!uploadedImage}>Regenerate Image</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRegenerate('both')} disabled={isRegenerating || !!uploadedImage}>Regenerate Both</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                             <Button onClick={handleSubmit} disabled={isSubmitting || !user}>
                                                 {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Send className="mr-2 h-5 w-5" />}
                                                 Submit for Glory
                                             </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                     <div className="flex-grow"/>
                                      {joke && (
                                        <div className="flex items-center gap-2">
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
                                      )}
                                     <div className="flex-grow"/>
                                    </>
                                )}
                            </CardFooter>
                        </JokeCard>
                    )}
                </div>

                 <div className="w-full flex flex-col items-center justify-center p-2 sm:p-4 gap-4">
                     <div className="bg-card/80 backdrop-blur-lg p-2 rounded-full shadow-lg flex items-center justify-center gap-1 sm:gap-2 border w-full max-w-sm sm:max-w-lg md:max-w-xl">
                        {mode === 'generate' && !isMemeReady && (
                        <Button onClick={handleGenerateNew} disabled={isLoading} size="lg" className="rounded-full font-bold text-base sm:text-lg flex-1 shadow-md h-12 sm:h-14">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-5 w-5" />
                            )}
                            Generate Joke
                        </Button>
                        )}
                        {(isMemeReady || uploadedImage) && (
                           <Button onClick={handleGenerateNew} disabled={isLoading} size="lg" className="rounded-full font-bold text-base sm:text-lg flex-1 shadow-md h-12 sm:h-14">
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileImage className="mr-2 h-5 w-5" />}
                                Start Over
                            </Button>
                        )}
                     </div>
                </div>
            </main>
        </div>
    );
}
