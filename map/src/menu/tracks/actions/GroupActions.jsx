import React, { forwardRef, useState } from 'react';
import { Box, ListItemIcon, ListItemText, MenuItem, Paper, Typography } from '@mui/material';
import styles from '../trackmenu.module.css';
import { ReactComponent as TimeIcon } from '../../../assets/icons/ic_action_gsave_dark.svg';
import GpxCollection from '../GpxCollection';

const GroupActions = forwardRef(({ group, setOpenActions }, ref) => {
    const [newCollection, setNewCollection] = useState([]);

    return (
        <>
            <Box ref={ref}>
                <Paper className={styles.actions}>
                    <MenuItem className={styles.groupAction} onClick={() => setNewCollection(group.files)}>
                        <ListItemIcon className={styles.iconGroupActions}>
                            <TimeIcon />
                        </ListItemIcon>
                        <ListItemText>
                            <Typography variant="inherit" className={styles.groupName} noWrap>
                                Download as OBF Collection
                            </Typography>
                        </ListItemText>
                    </MenuItem>
                </Paper>
            </Box>
            {newCollection.length > 0 && <GpxCollection tracks={newCollection} setOpenActions={setOpenActions} />}
        </>
    );
});

GroupActions.displayName = 'GroupActions';
export default GroupActions;