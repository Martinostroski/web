import { Box, IconButton, Tooltip } from '@mui/material';
// import { getGpxTime } from '../../../context/AppContext';
import { SortByAlpha, Update, History, CallMade, CallReceived } from '@mui/icons-material';
import { useState, useEffect } from 'react';

function byAlpha(files, reverse) {
    const sortedCopy = [...files].sort((f, s) => {
        if (reverse) {
            return f.name < s.name ? 1 : -1;
        } else {
            return f.name > s.name ? 1 : -1;
        }
    });
    return sortedCopy;
}

function byTime(files, reverse) {
    console.log('time', reverse);
    return files;
}

function byDistance(files, reverse) {
    const sortedCopy = [...files].sort((a, b) => {
        const A = a.analysis?.totalDistance ?? a.details?.analysis?.totalDistance ?? 0;
        const B = b.analysis?.totalDistance ?? b.details?.analysis?.totalDistance ?? 0;
        return reverse ? B - A : A - B;
    });
    return sortedCopy;
}

const allMethods = {
    alpha: {
        default: true,
        reverse: false,
        callback: byAlpha,
        directIcon: <SortByAlpha fontSize="small" />,
        reverseIcon: <SortByAlpha fontSize="small" sx={{ transform: 'scaleX(-1) scaleY(-1)' }} />,
        alt: 'Sort alphabetically',
    },
    time: {
        reverse: true,
        callback: byTime,
        directIcon: <Update fontSize="small" />,
        reverseIcon: <History fontSize="small" />,
        alt: 'Sort by time',
    },
    distance: {
        reverse: true,
        callback: byDistance,
        directIcon: <CallMade fontSize="small" />,
        reverseIcon: <CallReceived fontSize="small" />,
        alt: 'Sort by distance',
    },
};

const defaultMethod = () => {
    for (let l in allMethods) {
        if (allMethods[l].default) {
            return allMethods[l];
        }
    }
    return allMethods[Object.keys(allMethods)[0]];
};

export default function Actions({ files, setSortFiles }) {
    const [currentMethod, setCurrentMethod] = useState(defaultMethod);

    useEffect(() => {
        setSortFiles(currentMethod.callback(files, currentMethod.reverse));
    }, [files, currentMethod]); // ensure that files[] is modified for Object.is() check

    function select(method) {
        const isCurrent = method.alt === currentMethod.alt;
        setCurrentMethod({ ...method, reverse: isCurrent ? !currentMethod.reverse : method.reverse });
    }

    const icons = [];

    if (files && files.length > 1) {
        for (let m in allMethods) {
            const method = allMethods[m];
            const isCurrent = method.alt === currentMethod.alt;
            const reverse = isCurrent ? currentMethod.reverse : method.reverse;
            const icon = reverse ? method.reverseIcon : method.directIcon;
            const color = isCurrent ? 'primary' : '';
            icons.push(
                <Tooltip key={m} title={method.alt} placement="top" arrow>
                    <IconButton color={color} onClick={() => select(method)}>
                        {icon}
                    </IconButton>
                </Tooltip>
            );
        }
    }

    return <Box sx={{ ml: 4 }}>{icons}</Box>;

    // return (
    //     <div>
    //         <IconButton
    //             sx={{ ml: 4 }}
    //             onClick={(e) => {
    //                 e.stopPropagation();
    //                 const sortedCopy = [...files].sort((f, s) => {
    //                     let ftime = getGpxTime(f);
    //                     let stime = getGpxTime(s);
    //                     if (ftime === stime) {
    //                         return f.name > s.name ? 1 : -1;
    //                     }
    //                     if (timeUp) {
    //                         return ftime > stime ? 1 : -1;
    //                     } else {
    //                         return ftime < stime ? 1 : -1;
    //                     }
    //                 });
    //                 setTimeUp(!timeUp);
    //                 setSortFiles(sortedCopy);
    //             }}
    //         >
    //             <Sort fontSize="small" />
    //         </IconButton>
    //         <IconButton
    //             onClick={(e) => {
    //                 e.stopPropagation();
    //                 const sortedCopy = [...files].sort((f, s) => {
    //                     if (alphaUp) {
    //                         return f.name > s.name ? 1 : -1;
    //                     } else {
    //                         return f.name < s.name ? 1 : -1;
    //                     }
    //                 });
    //                 setAlphaUp(!alphaUp);
    //                 setSortFiles(sortedCopy);
    //             }}
    //         >
    //             <SortByAlpha fontSize="small" />
    //         </IconButton>
    //     </div>
    // );
}
