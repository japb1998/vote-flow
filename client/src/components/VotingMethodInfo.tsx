import React, { useState } from 'react';
import { VotingMethod } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import styles from './VotingMethodInfo.module.css';

interface VotingMethodInfoProps {
  selectedMethod: VotingMethod;
}

const methodDetails: Record<VotingMethod, { title: string; description: string; example: string }> = {
  single: {
    title: 'Single Choice (Plurality)',
    description: 'Each voter selects exactly one option. The option with the most votes wins.',
    example: 'Best movie Oscar - vote for your top choice'
  },
  approval: {
    title: 'Approval Voting',
    description: 'Voters can approve of multiple options. The option with the most approvals wins.',
    example: 'Hiring decision - approve all candidates you find acceptable'
  },
  ranked: {
    title: 'Ranked Choice (IRV)',
    description: 'Rank all options by preference. If no option gets >50%, eliminate the lowest and redistribute votes until there\'s a majority winner.',
    example: 'Election where voters rank candidates by preference'
  },
  score: {
    title: 'Score Voting (Range)',
    description: 'Rate each option from 1-5 stars. The option with the highest total score wins.',
    example: 'Rate recipes from 1-5 to find the most popular'
  },
  poker: {
    title: 'Planning Poker',
    description: 'Each participant picks a card from a Fibonacci-like sequence to estimate effort. Results show average, median, and whether the team reached consensus.',
    example: 'Sprint planning — estimate story points for a user story'
  },
  dot: {
    title: 'Dot Voting',
    description: 'Each voter distributes a fixed number of dots across options. The option with the most dots wins.',
    example: 'Prioritize backlog items — spread 3 dots across your top picks'
  },
  roman: {
    title: 'Roman Voting',
    description: 'Participants give a thumbs up, down, or sideways to indicate support. Passes if thumbs-up outnumber thumbs-down.',
    example: 'Quick consensus check — should we proceed with this approach?'
  },
  'fist-of-five': {
    title: 'Fist of Five',
    description: 'Hold up 1-5 fingers: 5 = strong support, 3 = neutral, 1 = blocking concern. Consensus is reached when no one votes 1 or 2.',
    example: 'Gauge team confidence — how do we feel about this design?'
  }
};

export function VotingMethodInfo({ selectedMethod }: VotingMethodInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const details = methodDetails[selectedMethod];

  return (
    <div className={styles.container}>
      <button 
        className={styles.toggleBtn}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>How does {details.title} work?</span>
        <span className={styles.toggleIcon}>{isExpanded ? '▲' : '▼'}</span>
      </button>
      
      {isExpanded && (
        <Card className={styles.infoCard}>
          <h4 className={styles.infoTitle}>{details.title}</h4>
          <p className={styles.infoDesc}>{details.description}</p>
          <p className={styles.infoExample}><strong>Example:</strong> {details.example}</p>
        </Card>
      )}
    </div>
  );
}

export function VotingMethodInfoStandalone() {
  const [expandedMethod, setExpandedMethod] = useState<VotingMethod | null>(null);

  return (
    <div className={styles.fullContainer}>
      <h3 className={styles.sectionTitle}>Voting Methods Explained</h3>
      {(Object.keys(methodDetails) as VotingMethod[]).map(method => (
        <div key={method} className={styles.methodItem}>
          <button 
            className={styles.methodHeader}
            onClick={() => setExpandedMethod(expandedMethod === method ? null : method)}
          >
            <span className={styles.methodName}>{methodDetails[method].title}</span>
            <span className={styles.toggleIcon}>{expandedMethod === method ? '▲' : '▼'}</span>
          </button>
          {expandedMethod === method && (
            <div className={styles.methodContent}>
              <p>{methodDetails[method].description}</p>
              <p className={styles.infoExample}><strong>Example:</strong> {methodDetails[method].example}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
