import C from 'ui/utils/constants';
import { on } from '@ember/object/evented';
import Component from '@ember/component';
import {
  set, get, computed, observer, setProperties
} from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import layout from './template';
import { next } from '@ember/runloop';

export default Component.extend({
  intl:        service(),
  scope:       service(),
  grafana:     service(),
  globalStore: service(),
  router:      service(),

  layout,

  nodes:             null,
  components:        null,
  showClusterTabs:   true,
  monitoringEnabled: alias('scope.currentCluster.enableClusterMonitoring'),
  componentStatuses: alias('scope.currentCluster.componentStatuses'),

  actions: {
    enalbeMonitoring() {
      get(this, 'router').transitionTo('authenticated.cluster.monitoring.cluster-setting');
    },
  },

  clusterDidChange: observer('scope.currentCluster.id', function() {
    set(this, 'showClusterTabs', false);
    next(() => {
      set(this, 'showClusterTabs', true);
    });
  }),

  setComponents: on('init', observer('componentStatuses.@each.conditions', 'nodes.@each.{state}', function() {
    setProperties(this, {
      etcdHealthy:       this.isHealthy('etcd'),
      controllerHealthy: this.isHealthy('controller-manager'),
      schedulerHealthy:  this.isHealthy('scheduler'),
      nodesHealthy:      get(this, 'inactiveNodes.length') === 0
    })
  })),

  showDashboard: computed('scope.currentCluster.isReady', 'nodes.[]', function() {
    return get(this, 'nodes').length && get(this, 'scope.currentCluster.isReady')
  }),

  inactiveNodes: computed('nodes.@each.state', function() {
    return get(this, 'nodes').filter( (n) => C.ACTIVEISH_STATES.indexOf(get(n, 'state')) === -1 );
  }),

  unhealthyComponents: computed('componentStatuses.@each.conditions', function() {
    return (get(this, 'componentStatuses') || [])
      .filter((s) => !s.conditions.any((c) => c.status === 'True'));
  }),

  isHealthy(field) {
    return (get(this, 'componentStatuses') || [])
      .filter((s) => s.name.startsWith(field))
      .any((s) => s.conditions.any((c) => c.status === 'True'));
  }
});
