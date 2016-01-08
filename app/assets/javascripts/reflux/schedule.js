(function() {
  //
  // Schedules
  //
  window.SKScheduleAction = Reflux.createActions([
    'loadSchedules',
    'temporaryizeSection',
    'untemporaryizeSection',
    'commitSection',
    'changeSchedule',
    'getConflicts'
  ]);

  window.SKScheduleStore = Reflux.createStore({
    listenables: [SKScheduleAction],

    getInitialState: function() {
      this.state = {
        schedule: null,
        schedules: {},
        pretempYrTerm: null,
        temporaryAdds: [],
        temporaryDeletes: [],
        temporaryGhosts: []
      };

      return this.state;
    },

    loadSchedules: function(schedules, defaultSchedule) {
      this.state.schedules = schedules;
      this.changeSchedule(defaultSchedule);
    },

    changeSchedule: function(yrTerm) {
      this.state.schedule = this.state.schedules[yrTerm];
      this.state.pretempYrTerm = yrTerm;
      this.trigger(this.state);
    },

    temporaryizeSection: function(section) {
      this.state = {
        schedule: this.state.schedule,
        schedules: this.state.schedules,
        pretempYrTerm: this.state.pretempYrTerm,
        temporaryAdds: this.state.temporaryAdds,
        temporaryDeletes: this.state.temporaryDeletes,
        temporaryGhosts: this.state.temporaryGhosts
      };

      //we might need to switch schedules (if it's a different term)
      //save the yrTerm, create a new schedule if needed, and switch to it
      var yrTerm = section.course.yrTerm;
      if (this.state.schedule) {
        this.state.pretempYrTerm = this.state.schedule.yrTerm;
      }
      if (!this.state.schedules[yrTerm]) {
        this.state.schedules[yrTerm] = {
          yrTerm: yrTerm,
          term: section.course.term,
          year: section.course.year,
          sections: []
        };
      }
      this.state.schedule = this.state.schedules[yrTerm];

      var conflicts = this.getConflicts(section);

      if (conflicts == null) { //already added, so "remove" it
        this.state.temporaryDeletes.push(section);
      }
      else { //"add" it
        this.state.temporaryAdds.push(section);
        if (conflicts.length > 0) {
          //"remove" any conflicts
          var self = this;
          conflicts.some(function(conflict) {
            self.state.temporaryDeletes.push(conflict);
          });
        }
      }

      this.trigger(this.state);
    },

    untemporaryizeSection: function(section) {
      //undo everything in the method above, basically
      this.state = {
        schedule: this.state.schedules[this.state.pretempYrTerm],
        schedules: this.state.schedules,
        pretempYrTerm: this.state.pretempYrTerm,
        temporaryAdds: [],
        temporaryDeletes: [],
        temporaryGhosts: []
      };

      this.trigger(this.state);
    },

    commitSection: function(section) {
      this.state = {
        schedule: this.state.schedule,
        schedules: this.state.schedules,
        pretempYrTerm: this.state.pretempYrTerm,
        temporaryAdds: this.state.temporaryAdds,
        temporaryDeletes: this.state.temporaryDeletes,
        temporaryGhosts: this.state.temporaryGhosts
      };

      //full switch to this (don't undo when we unhover)
      this.state.pretempYrTerm = section.course.yrTerm;

      var ajaxBody = {};

      var conflicts = this.getConflicts(section);

      if (conflicts == null) {
        //removing it
        var idx = -1;
        while (this.state.schedule.sections[++idx].crn != section.crn);
        this.state.schedule.sections.splice(idx, 1);

        ajaxBody[section.crn] = -1;
      }
      else {
        //adding it
        this.state.schedule.sections.push(section);
        ajaxBody[section.crn] = 1;
        //remove any conflicts
        var self = this;
        conflicts.some(function (conflict) {
          var idx = -1;
          while (self.state.schedule.sections[++idx].crn != conflict.crn);
          self.state.schedule.sections.splice(idx, 1);
          ajaxBody[conflict.crn] = -1;
        });
      }

      this.state.temporaryAdds = [];
      this.state.temporaryGhosts = this.state.temporaryDeletes;
      this.state.temporaryDeletes = [];

      this.courseAjax(ajaxBody);

      this.trigger(this.state);
    },


    courseAjax: function(data) {
      var self = this;
      $.post("add_drop_sections", {data:data},
        function (response)
        {
          //success
          //store the secret in a cookie
          var d = new Date();
          d.setTime(d.getTime() + (4*365*24*60*60*1000));
          document.cookie = "s_id=x&"+response.userSecret+"; expires="+d.toUTCString()+"; domain=.skedgeur.com";

          //update schedule
          self.state.schedules = response.schedules;
          self.trigger(self.state);
        }
        ).fail(function (response)
        {
          //failure
          //undo everything in data!
          alert("failure :(");
        }
        );
    }
  });

  window.SKScheduleStore.existsConflict = function(s1, s2, day) {
    if (s1.days && s2.days) {
      var overlap = function(day) {
        return s2.days.indexOf(day) > -1;
      };
      var dayOverlap = day ? overlap(day) : s1.days.split("").some(overlap);
      if (dayOverlap) {
        return ((s1.startTime >= s2.startTime && s1.startTime < s2.endTime) || 
                (s1.endTime > s2.startTime && s1.endTime <= s2.endTime)) ||
               ((s2.startTime >= s1.startTime && s2.startTime < s1.endTime) || 
                (s2.endTime > s1.startTime && s2.endTime <= s1.endTime));
      }
    }
    return false;
  };

  window.SKScheduleStore.sectionConflict = function(section, sections, day) {
    var conflicts = [];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].crn == section.crn) {
        return null;
      }
      if (this.existsConflict(section, sections[i], day)) {
        conflicts.push(sections[i]);
      }
    }
    return conflicts;
  };

  window.SKScheduleStore.getConflicts = function(section) {
    var schedule;
    if (schedule = this.state.schedules[section.course.yrTerm]) {
      return this.sectionConflict(section, schedule.sections);
    }
    return [];
  };
})();